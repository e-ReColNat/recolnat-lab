/**
 * Popup for the LineMeasure tool.
 *
 * Created by dmitri on 30/09/15.
 */
"use strict";
import React from "react";
import d3 from 'd3';

import LineMeasure from '../impl/LineMeasure';

import Tooltip from '../../components/bench/ActiveToolTooltip';

import TagInput from '../../components/common/TagInput';

import Globals from '../../utils/Globals';

import Styles from '../../constants/Styles';

import ServiceMethods from '../../utils/ServiceMethods';
import ViewUtils from '../../utils/D3ViewUtils';

import ToolActions from '../../actions/ToolActions';

import ToolsConf from '../../conf/Tools-conf';


class LineMeasurePopup extends React.Component {
  constructor(props) {
    super(props);

    this.containerStyle = {
      width: '200px',
      display: "flex",
      flexDirection: "column",
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: "black",
      padding: "5px",
      color: 'black',
      marginTop: '5px'
    };

    this.titleBarStyle = {
      display: 'flex',
      width: '198px',
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: 'whitesmoke',
      borderStyle: "solid",
      borderWidth: "0 0 1px 0",
      borderColor: "black",
      padding: 0,
      margin: 0,
      position: 'relative',
      top: '-5px',
      left: '-5px'
    };

    this.titleStyle = {
      marginLeft: '5px',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      MsUserSelect: 'none',
      userSelect: 'none',
      cursor: 'default'
    };

    this.pixelValueDisplayStyle = JSON.parse(JSON.stringify(Styles.buttonSubText));
    this.pixelValueDisplayStyle.display = 'relative';
    this.pixelValueDisplayStyle.top = '-10px';

    this.iconStyle = {
      cursor: 'pointer'
    };

    this.windowBodyStyle = {
      display: ''
    };

    this.optionStyle = {
      color: '#2f4f4f'
    };

    this.horizontalContainerStyle = {
      display: "flex",
      flexDirection: "row",
      maxWidth: '100%',
      paddingBottom: '3px'
    };

    this.textAreaStyle = {
      width: '100%'
      // height: '30px'
    };

    this.headerStyle = {
      display: 'flex',
      alignItems: 'baseline'
    };

    this.headerTextStyle = {
      fontSize: "10px"
    };

    this.tagListStyle = {
      maxHeight: '30px',
      overflow: 'auto'
    };

    this.imageNameTextStyle = {
      fontSize: "10px",
      fontWeight: 'bold',
      charSet: "utf8"
    };

    this.nameAssistanceButtonStyle = {
      display: 'flex',
      justifyContent: 'flex-end',
      fontSize: "8px",
      cursor: 'pointer'
    };

    this.tableCellStyle = {
      fontSize: '10px',
      margin: '1px 2px',
      padding: 0
    };

    this.scrollingTableStyle = JSON.parse(JSON.stringify(Styles.compact));
    this.scrollingTableStyle.maxHeight = '200px';
    this.scrollingTableStyle.overflow = 'auto';

    this.measureStandardPanelStyle = {
      padding: '5px 5px 5px 5px',
      margin: 0,
      display: 'none'
    };

    this.currentMeasurePanelStyle = {
      padding: '5px 5px 5px 5px',
      margin: 0,
      display: ''
    };

    this._toolDataUpdated = () => {
      const displayData = () => this.getMeasures();
      return displayData.apply(this);
    };

    this._forceRender = () => {
      const update = () => this.setState({});
      return update.apply(this);
    };

    this.state = {
      measures: [],
      scales: {},
      scale: "null",
      name: '',
      prefix: '',
      index: 1,
      imageName: '',
      lengthInPx: 0,
      refName: null,
      mmPerPx: null,
      mode: 'measure',
      nameAssistanceFillMode: 0,
      tags: [],
      inputTag: false,
      position: {
        top: null,
        left: null
      }
    };
  }

  activateTagInput() {
    let box = React.findDOMNode(this.refs.tagHelp).getBoundingClientRect();
    this.setState({inputTag: true, position: {top: box.top, left: box.left}});
  }

  getName() {
    if(this.state.nameAssistanceFillMode === 0) {
      return this.state.name;
    }
    else if(this.state.nameAssistanceFillMode === 2) {
      return this.state.prefix + ' ' + this.state.index;
    }
    else {
      console.error('No naming handler for assistance fill mode ' + this.state.nameAssistanceFillMode);
      return this.state.name;
    }
  }

  getMeasures() {
    let self = this;
    let name = this.getName();
    let newTempMeasures = [];
    let scales = {};
    let currentTempMeasures = JSON.parse(JSON.stringify(this.state.measures));
    d3.selectAll('.' + LineMeasure.classes().selfGroupSvgClass).each(function(d, i) {
      d.lengthInPx = Math.sqrt(Math.pow(d.x2 - d.x1, 2) + Math.pow(d.y2 - d.y1, 2));
      d.imageName = self.props.metastore.getMetadataAbout(d.image).name;
      scales = _.extend(scales, d.scales);
      if(i < currentTempMeasures.length) {
        newTempMeasures.push(d);
      }
      else {
        d.name = name;
        newTempMeasures.push(d);
      }
    });

    newTempMeasures = _.sortBy(newTempMeasures, Globals.getCreationDate);

    let lastMeasure = newTempMeasures[newTempMeasures.length-1];
    let imageName = this.state.imageName;

    let px = 0;
    let mmPerPx = null;
    let scaleDisplay = null;
    if(lastMeasure) {
      let imageData = this.props.metastore.getMetadataAbout(lastMeasure.image);
      imageName = imageData.name;
      px = Math.sqrt(Math.pow(lastMeasure.x2 - lastMeasure.x1, 2) + Math.pow(lastMeasure.y2 - lastMeasure.y1, 2));
      mmPerPx = lastMeasure.mmPerPixel;
      scaleDisplay = lastMeasure.scale;
    }

    console.log(JSON.stringify(scales));

    this.setState({
      measures: newTempMeasures,
      scales: scales,
      scale: scaleDisplay?scaleDisplay:'null',
      imageName: imageName,
      lengthInPx: px,
      mmPerPx: mmPerPx
    });
  }

  setScale(uid) {
    //console.log("Set scale " + event.target.value);
    this.setState({scale: uid});
  }

  minimize() {
    this.windowBodyStyle.display = this.windowBodyStyle.display == 'none' ? '' : 'none';
    this.setState({});
  }

  getScaleName() {
    if(this.state.scale === 'null') {
      return this.props.userstore.getText('nothing');
    }
    if(this.state.scale === 'exif') {
      return 'EXIF';
    }
    if(this.state.scales[this.state.scale]) {
      return this.state.scales[this.state.scale].name;
    }
  }

  cycleAssistFillModes() {
    if(this.state.nameAssistanceFillMode === 0) {
      this.setState({nameAssistanceFillMode: 2, prefix: this.state.name});
    }
    else {
      this.setState({nameAssistanceFillMode: 0, name: this.state.prefix});
    }
  }

  onNameChange(event) {
    // this.nameChanged(event.target.value);
    this.setState({name: event.target.value});
  }

  onIndexChange(event) {
    // this.nameChanged(this.state.prefix + ' ' + event.target.value);
    this.setState({index: event.target.value});
  }

  onPrefixChange(event) {
    // this.nameChanged(event.target.value + ' ' + this.state.index);
    this.setState({prefix: event.target.value});
  }

  nameChanged(name) {
    let measures = this.state.measures;
    if(this.state.measures.length > 0) {
      measures[measures.length-1].name = name;
      d3.selectAll('#MEASURE-' + measures[measures.length-1].uid).each(d => d.name = name);
    }
    this.setState({
      // name: name,
      measures: measures});
  }

  setMode(mode) {
    if(mode === 'standard') {
      if(this.state.measures.length > 0) {
        let proceed = confirm(this.props.userstore.getText('unsavedChangesWillBeLost'));
        if (proceed) {
          window.setTimeout(ToolActions.setTool.bind(null, ToolsConf.newMeasureStandard.id), 10);
        }
      }
      else {
        window.setTimeout(ToolActions.setTool.bind(null, ToolsConf.newMeasureStandard.id), 10);
      }
    }
    else {
      this.setState({mode: mode});
    }
  }

  getAssistFillModeDisplay() {
    switch(this.state.nameAssistanceFillMode) {
      case 0:
        return this.props.userstore.getText('manualInput');
      case 1:
        return this.props.userstore.getText('dictionary');
      case 2:
        return this.props.userstore.getText('titleAndNumber');
      default:
        return this.props.userstore.getText('error');
    }
  }

  save() {
    for(let i = 0; i < this.state.measures.length; ++i) {
      let measure = this.state.measures[i];
      let path = [[measure.x1, measure.y1], [measure.x2, measure.y2]];
      ServiceMethods.createTrailOfInterest(measure.image, measure.lengthInPx, path, measure.name, this.saved.bind(this));
    }
    window.setTimeout(ToolActions.reset, 10);

    this.setState({
      measures: [],
      scales: {},
      scale: 'null',
      name: '',
      imageName: '',
      lengthInPx: 0,
      mode: 'measure',
      refName: null,
      mmPerPx: null,
      nameAssistanceFillMode: 0
    });
  }

  saved(msg) {
    if(msg.clientProcessError) {
      alert('Technical problem while saving data : ' + JSON.stringify(msg));
    }
    else {
      // Save tags
      let entityId = msg.data.id;
      for(let i = 0; i < this.state.tags.length; ++i) {
        let tag = this.state.tags[i];
        ServiceMethods.createAddTag(tag.key, tag.value, entityId);
      }
    }
  }

  removeMeasure(idx) {
    let data = this.state.measures[idx];
    d3.select('#MEASURE-' + data.id).remove();
    window.setTimeout(ToolActions.updateToolData.bind(null, null), 10);
  }

  zoomOnMeasure(idx) {
    let data = this.state.measures[idx];
    ViewUtils.zoomToObjectBySelector('#MEASURE-' + data.id, this.props.viewstore.getView());
  }

  editName(idx) {
    let data = this.state.measures[idx];

    let name = prompt(this.props.userstore.getText('name'), data.name);
    d3.selectAll('#MEASURE-' + data.id).each(function(d) {
      d.name = name;
    });
    this._toolDataUpdated();
  }

  getForm() {
    if(this.state.nameAssistanceFillMode === 0) {
      return(
        <form autoComplete='on'
              key='noAssist'
              onSubmit={this.saveAutofill.bind(this)}
              ref='form'>
          <input placeholder={this.props.userstore.getText('name')}
                 name='name'
                 type='text'
                 style={this.textAreaStyle}
                 onChange={this.onNameChange.bind(this)}
                 value={this.state.name}
                 autoFocus="true"
                 wrap="hard"/>
          <button type="submit" ref='autocompleteTrigger' style={{display: 'none'}} />
        </form>);
    } else if(this.state.nameAssistanceFillMode === 2) {
      return(
        <form autoComplete='on'
              key='nameAndIndex'
              onSubmit={this.saveAutofill.bind(this)}
              ref='form'>
          <input placeholder={this.props.userstore.getText('name')}
                 name='name'
                 type='text'
                 style={this.textAreaStyle}
                 onChange={this.onPrefixChange.bind(this)}
                 value={this.state.prefix}
                 autoFocus="true"
                 wrap="hard"/>
          <input autoComplete='off'
                 name='index'
                 type='number'
                 style={this.textAreaStyle}
                 onChange={this.onIndexChange.bind(this)}
                 value={this.state.index}
                 autoFocus="true"
                 wrap="hard"/>
          <button type="submit" ref='autocompleteTrigger' style={{display: 'none'}} />
        </form>);
    }
    else {
      return null;
    }
  }

  addTag(entity, key, value) {
    let tags = JSON.parse(JSON.stringify(this.state.tags));
    tags.push({key: key, value: value});
    this.setState({tags: tags});
  }

  displayTag(tag, idx) {
    let displayName = tag.key;
    if(tag.value) {
      displayName = displayName + ' : ' + tag.value;
    }
    return (
      <a key={'TAG-' + idx}
         style={Styles.tag}
         className={'ui tag label'}>{displayName}</a>
    );
  }

  updataPopups() {
    $(React.findDOMNode(this.refs.help)).popup({
      popup: $(React.findDOMNode(this.refs.tooltip)),
      target: $(React.findDOMNode(this.refs.container)),
      position: 'left center'
    });

    $(React.findDOMNode(this.refs.tagHelp)).popup();
    $(React.findDOMNode(this.refs.activateTag)).popup();
  }

  componentDidMount() {
    this.props.userstore.addLanguageChangeListener(this._forceRender);
    this.props.toolstore.addToolDataChangeListener(this._toolDataUpdated);
    this.updataPopups();
  }

  componentWillUpdate(nextProps, nextState) {
    this.measureStandardPanelStyle.display = nextState.mode === 'standard'? '':'none';
    this.currentMeasurePanelStyle.display = nextState.mode === 'measure'? '':'none';

    if(nextState.nameAssistanceFillMode === 2) {
      if(nextState.measures.length > 0) {
        if (nextState.measures.length !== this.state.measures.length && this.state.measures.length !== 0) {
          nextState.index++;
        }

        if (nextState.prefix !== this.state.prefix || nextState.index !== this.state.index) {
          nextState.measures[nextState.measures.length - 1].name = nextState.prefix + ' ' + nextState.index;
          d3.selectAll('#MEASURE-' + nextState.measures[nextState.measures.length - 1].uid).each(d => d.name = nextState.prefix + ' ' + nextState.index);
        }
      }
    }
    else if(nextState.nameAssistanceFillMode === 0) {
      if(nextState.measures.length > 0 && (nextState.prefix !== this.state.prefix || nextState.index !== this.state.index)) {
        nextState.measures[nextState.measures.length - 1].name = nextState.name;
        d3.selectAll('#MEASURE-' + nextState.measures[nextState.measures.length - 1].uid).each(d => d.name = nextState.name);
      }
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state.scale != prevState.scale) {
      if(this.state.scale == "null") {
        this.props.setScaleCallback(null);
      }
      else {
        this.props.setScaleCallback(this.state.scale);
      }
    }

    this.updataPopups();

    if(this.state.measures.length !== prevState.measures.length) {
      $(React.findDOMNode(this.refs.autocompleteTrigger)).click();
    }
  }

  componentWillUnmount() {
    this.props.userstore.removeLanguageChangeListener(this._forceRender);
    this.props.toolstore.removeToolDataChangeListener(this._toolDataUpdated);
  }

  saveAutofill(e) {
    Globals.saveAutofill(React.findDOMNode(this.refs.form), this.saveAutofill.bind(this), e);
  }

  render() {
    let self = this;

    return(
      <div style={this.containerStyle} ref='container' className='ui segment'>
        <div className='ui segment' style={this.titleBarStyle} >
          <div style={this.titleStyle}>{this.props.userstore.getText('newMeasure')}</div>
          <div>
            <i className='ui blue help circle icon'
               ref='help'
               style={this.iconStyle} />
            <i className='ui minus icon'
               style={this.iconStyle}
               onClick={this.minimize.bind(this)} />
            <i className='ui remove icon'
               style={this.iconStyle}
               onClick={Globals.noActiveTool} />
          </div>
        </div>
        <div style={this.windowBodyStyle}>
          <Tooltip userstore={this.props.userstore}
                   toolstore={this.props.toolstore}
                   ref='tooltip'
                   cClasses='ui popup' />
          <div className='ui segment' style={this.currentMeasurePanelStyle}>
            <div className='title' style={this.headerTextStyle}>{this.props.userstore.getText('currentMeasure')}</div>
            <div style={Styles.text}>
              <span style={this.imageNameTextStyle}>
                {this.state.imageName}
                </span>
            </div>
            <div className='ui mini compact fluid button' onClick={this.setMode.bind(this, 'standard')}>
              <div>{this.props.userstore.getText('measureStandard')}</div>
              <div style={Styles.buttonSubText}>{this.getScaleName()}</div>
            </div>
            <a className='ui link text'
               style={this.nameAssistanceButtonStyle}
               onClick={this.cycleAssistFillModes.bind(this)}>
              {this.getAssistFillModeDisplay()}
            </a>
            <div style={this.horizontalContainerStyle}>
              {this.getForm()}
            </div>
            <div  style={this.headerTextStyle}>
              {this.props.userstore.getInterpolatedText('length', [this.state.mmPerPx?(this.state.lengthInPx * this.state.mmPerPx).toFixed(2) : '**'])}
              mm <span style={this.pixelValueDisplayStyle}>({this.state.lengthInPx.toFixed(2)} px)</span>
            </div>
          </div>

          <div className='ui segment' style={this.currentMeasurePanelStyle}>
            <div className='title' style={this.headerStyle}>
              <div  style={this.headerTextStyle}>
                {this.props.userstore.getText('tags')}
              </div>
              <i className='ui small blue help circle icon'
                 ref='tagHelp'
                 data-content={this.props.userstore.getText('autoTagTooltip')}
                 style={this.iconStyle} />
            </div>
            <div className='ui mini labels' style={this.tagListStyle}>
              {this.state.tags.map(this.displayTag.bind(this))}
              <div className='ui mini label basic positive button'
                   ref='activateTag'
                   data-content={this.props.userstore.getText('addATag')}
                   onClick={this.activateTagInput.bind(this)}>
                <i className='icons'>
                  <i className='tag icon' />
                  <i className='corner add icon' />
                </i>
              </div>
            </div>
            {this.state.inputTag?<TagInput
                onTagSave={this.addTag.bind(this)}
                onClose={this.setState.bind(this, {inputTag: false}, null)}
                top={this.state.position.top+10}
                right={this.state.position.left-50}/> : null}
          </div>

          <div className='ui segment' style={this.scrollingTableStyle}>
            <div style={this.headerTextStyle}>
              {this.props.userstore.getText('newMeasuresUnsaved')}
            </div>
            <table className='ui celled table'  style={self.tableCellStyle}>
              <thead>
              <tr>
                <th style={self.tableCellStyle} className='six wide'>{this.props.userstore.getText('name')}</th>
                <th style={self.tableCellStyle} className='five wide'>{this.props.userstore.getText('length')}</th>
                <th style={self.tableCellStyle} className='four wide'>{this.props.userstore.getText('sheet')}</th>
                <th style={self.tableCellStyle} className='three wide'>{this.props.userstore.getText('actions')}</th>
              </tr>
              </thead>
              <tbody>
              {_.sortBy(this.state.measures, Globals.getCreationDate).reverse().map(function(m, idx) {
                return <tr key={idx}>
                  <td style={self.tableCellStyle} onClick={self.editName.bind(self, idx)}>{m.name}</td>
                  <td style={self.tableCellStyle}>{m.mmPerPixel? (m.lengthInPx*m.mmPerPixel).toFixed(2) + '' + m.unit : m.lengthInPx.toFixed(2) + 'px'}</td>
                  <td style={self.tableCellStyle}>{m.imageName}</td>
                  <td style={self.tableCellStyle}>
                    <i style={Styles.noMargin} className='ui remove icon' onClick={self.removeMeasure.bind(self, idx)}/>
                    <i style={Styles.noMargin} className='ui eye icon' onClick={self.zoomOnMeasure.bind(self, idx)}/>
                  </td>
                </tr>
              })}
              </tbody>
            </table>
          </div>
          <div>
            <button className='ui mini compact button' style={this.textStyle} onClick={Globals.noActiveTool}>{this.props.userstore.getText('cancel')}</button>
            <button className='ui compact green button' style={this.textStyle} onClick={this.save.bind(this)}>{this.props.userstore.getText('save')}</button>
          </div>
        </div>
      </div>
    );
  }
}

export default LineMeasurePopup;