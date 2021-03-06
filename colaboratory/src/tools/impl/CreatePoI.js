/**
 * Implementation of AbstractTool to create Points of Interest.
 *
 * Created by hector on 31/07/15.
 */

'use strict';

import React from "react";
import d3 from "d3";

import AbstractTool from "../AbstractTool";

import ToolActions from '../../actions/ToolActions';
import ViewActions from '../../actions/ViewActions';

import Classes from "../../constants/CommonSVGClasses";

import Popup from "../popups/CreatePoIPopup";

import ServiceMethods from '../../utils/ServiceMethods';
import Globals from '../../utils/Globals';

import conf from "../../conf/ApplicationConfiguration";
import ToolConf from "../../conf/Tools-conf";

import markerSvg from '../../images/poi.svg';

class CreatePoI extends AbstractTool {
  constructor(props) {
    super(props);
    this.vertexClass = "CREATE_POI_VERTEX";

    this.state = this.initialState();

    this._onViewPropertiesUpdate = () => {
      const viewPropsUpdate = () => d3.select('.' + this.vertexClass).attr('transform', 'translate(' + this.state.x + ',' + this.state.y + ')scale(' + this.props.viewstore.getViewProperties().sizeOfTextAndObjects + ')');
      return viewPropsUpdate.apply(this);
    };

    this._onViewChange = () => {
      const adaptPoIScale = () => this.drawPointInSVG();
      return adaptPoIScale.apply(this);
    }
  }

  initialState() {
    return {
      imageUri: null,
      imageLinkUri: null,
      active: false,
      x: null,
      y: null,
      displayX: null,
      displayY: null,
      name: ''
    };
  }

  /**
   * INHERITED API
   */
  canSave() {
    return true;
  }

  setMode() {
    ToolActions.setTool(ToolConf.newPointOfInterest.id);
  }

  save() {
    if(!this.state.x || !this.state.y) {
      alert(this.props.userstore.getInterpolatedText('invalidCoordinates', [this.state.x, this.state.y]));
      return;
    }

    ServiceMethods.createPointOfInterest(this.state.imageUri, this.state.x, this.state.y, this.state.name, Globals.setSavedEntityInInspector);

    window.setTimeout(ToolActions.updateTooltipData.bind(null, this.props.userstore.getText('newPointOfInterestTooltip')), 10);

    this.clearSVG();

    this.setState({x: null, y: null, displayX: null, displayY: null, imageUri: null, imageLinkUri: null});
  }

  begin() {
    let popup = <Popup vertexClass={this.vertexClass}
                       userstore={this.props.userstore}
                       toolstore={this.props.toolstore}
                       setNameCallback={this.setName.bind(this)}
    />;
    window.setTimeout(ToolActions.activeToolPopupUpdate.bind(null, popup), 10);

    window.setTimeout(ToolActions.updateTooltipData.bind(null, this.props.userstore.getText('newPointOfInterestTooltip')), 10);
    window.setTimeout(ViewActions.updateDisplayFilters.bind(null, {points: true}), 10);

    let self = this;
    d3.selectAll('.' + Classes.IMAGE_CLASS)
      .on('click', function(d, i) {
        if(d3.event.defaultPrevented) return;
        if(d3.event.button == 0) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
          self.leftClick.call(this, self, d);
        }
      })
      .on('contextmenu', function(d, i) {
        if(d3.event.defaultPrevented) return;
        d3.event.preventDefault();
        d3.event.stopPropagation();
        self.rightClick.call(this, self, d);
      })
      .style('cursor', 'crosshair');

    this.props.viewstore.addViewportListener(this._onViewChange);

    this.setState({active: true});
  }

  reset() {
    let popup = <Popup vertexClass={this.vertexClass}
                       userstore={this.props.userstore}
                       toolstore={this.props.toolstore}
                       setNameCallback={this.setName.bind(this)}
    />;
    window.setTimeout(ToolActions.activeToolPopupUpdate.bind(null, popup), 10);

    window.setTimeout(ToolActions.updateTooltipData.bind(null, this.props.userstore.getText('newPointOfInterestTooltip')), 10);

    this.clearSVG();
    this.setState({x: null, y: null, displayX: null, displayY: null, imageUri: null, imageLinkUri: null, name: ''});
  }

  finish() {
    window.setTimeout(ToolActions.activeToolPopupUpdate, 10);
    window.setTimeout(ToolActions.updateTooltipData.bind(null, ""), 10);
    this.clearSVG();

    this.props.viewstore.removeViewportListener(this._onViewChange);

    d3.selectAll('.' + Classes.IMAGE_CLASS)
      .on('click', null)
      .on('contextmenu', null)
      .style('cursor', 'default');

    this.setState(this.initialState());
  }

  /**
   * INTERNAL METHODS
   */
  leftClick(self, d) {
    let coords = d3.mouse(this);
    self.setState({imageUri: d.entity, imageLinkUri: d.link});
    self.setPointCoordinates.call(self, coords[0], coords[1], d);
  }

  rightClick(self, d) {

  }

  setPointCoordinates(x, y, data) {
    if(x >= 0 && y >= 0 && x <= data.width && y <= data.height ) {
      this.setState({x: x, y: y});
    }
    else {
      window.setTimeout(ToolActions.updateTooltipData.bind(null, this.props.userstore.getText('vertexOutsideImageError')), 50);
    }
  }

  drawPointInSVG() {
    d3.select("." + this.vertexClass).remove();
    // if(vertex.empty()) {
      let toolDisplayGroup = d3.select('#OVER-' + this.state.imageLinkUri);

      let vertex = toolDisplayGroup
        .append('g')
        .attr("class", this.vertexClass)
        .style('pointer-events', 'none');

      vertex.append("svg:title");

      vertex.append('svg:image')
        .attr("height", 100)
        .attr("width", 60)
        .attr('xlink:href', markerSvg);
    // }

    let view = this.props.viewstore.getView();
    let viewProps = this.props.viewstore.getViewProperties();

    vertex
      .attr('transform', 'translate(' + this.state.x + ',' + this.state.y + ')scale(' + viewProps.sizeOfTextAndObjects/view.scale + ')');

    vertex.select('image')
      .attr("x", -30)
      .attr("y", -100);

    vertex.select('title').text(this.state.name);
  }

  setName(name) {
    //console.log("set data " + text + " " + letters);
    this.setState({name: name});
  }

  clearSVG() {
    d3.select("." + this.vertexClass).remove();
  }

  /**
   * REACT API
   */
  componentDidMount() {
    super.componentDidMount();
    this.props.viewstore.addViewPropertiesUpdateListener(this._onViewPropertiesUpdate);
    window.setTimeout(ToolActions.registerTool.bind(null, ToolConf.newPointOfInterest.id, this.click, this), 10);
  }

  componentDidUpdate() {
    if(this.state.x) {
      this.drawPointInSVG();
      if(this.state.name)
      {
        d3.select('.' + this.props.vertexClass).select('title').text(this.state.name);
      }
    }
    else {
      this.clearSVG();
    }
  }

  componentWillUpdate(nextProps, nextState) {
    if(nextState.active) {
      this.buttonStyle.backgroundColor = 'rgba(200,200,200,1.0)';
    }
    else {
      this.buttonStyle.backgroundColor = null;
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.props.viewstore.removeViewPropertiesUpdateListener(this._onViewPropertiesUpdate);
  }

  render() {
    return (
      <button className='ui button compact'
              ref='button'
              onClick={this.setMode}
              style={this.buttonStyle}
              data-content={this.props.userstore.getText('newPointOfInterestTooltip1')}>
        <i className='ui large marker icon'></i>
      </button>
    );
  }

}

export default CreatePoI;
