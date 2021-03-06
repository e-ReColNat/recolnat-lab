/**
 * Component containing the lab bench which displays the 2D-space enabling the user to do most of their annotation work.
 *
 * Created by dmitri on 30/03/15.
 */
'use strict';

import React from 'react';

import BenchLabFreeSpace from './bench/FreeSpace';

import OrbalContextMenu from './context-menu/OrbalContextMenu';
import Inbox from './bench/Inbox';
import BenchLabBorders from './bench/BenchLabBorders';
import ActiveSetNameDisplay from './bench/ActiveSetNameDisplay';
import ImagesLoadingStatus from './common/ImagesLoadingStatus';
import EntityFilters from './bench/EntityFilters';

import DragNDropStore from '../stores/DragNDropStore';

import Popup from "./bench/PopupToolComponent";

import ModalActions from '../actions/ModalActions';

import ModalConstants from '../constants/ModalConstants';

const drag = new DragNDropStore();

class VirtualBenchLab extends React.Component {

  constructor(props) {
    super(props);

    this.componentContainerStyle = {
      display: 'block',
      height: '100%',
      width: '100%'
    };

    this.dimmerStyle = {
      display: 'none',
      opacity: '0.5 !important'
    };

    this.importSheetButtonStyle = {
      position: 'absolute',
      right: '100px',
      bottom: '5px',
      width: '15px'
    };

    this.importSheetButtonIconStyle = {
      margin:0,
      padding: '10px'
    };

    this.state = {
      isVisibleInCurrentMode: this.isComponentVisibleInCurrentMode(),
      loader: null,
      loading: ''
    };

    this._onModeChange = () => {
      const setModeVisibility = () => this.setState({
        isVisibleInCurrentMode: this.isComponentVisibleInCurrentMode()
      });
      return setModeVisibility.apply(this);
    };
  }

  isComponentVisibleInCurrentMode() {
    return this.props.modestore.isInOrganisationMode() || this.props.modestore.isInObservationMode();
  }

  componentDidMount() {
    this.props.modestore.addModeChangeListener(this._onModeChange);
    this.props.userstore.addLanguageChangeListener(this.setState.bind(this, {}));
    $(this.refs.import.getDOMNode()).popup({
      position: 'top center'
    });
  }

  componentWillUpdate(nextProps, nextState) {
    if(nextState.loader) {
      nextState.loading = 'active'
    }
    else {
      nextState.loading = '';
    }
  }

  componentDidUpdate(prevProps, prevState) {

  }

  componentWillUnmount() {
    this.props.modestore.removeModeChangeListener(this._onModeChange);
    this.props.userstore.removeLanguageChangeListener(this.setState.bind(this, {}));
  }

  render() {
    return(
      <div style={this.componentContainerStyle}>
        <ActiveSetNameDisplay
          userstore={this.props.userstore}
          managerstore={this.props.managerstore}/>
        <Inbox
          benchstore={this.props.benchstore}
          metastore={this.props.metastore}
          viewstore={this.props.viewstore}
          userstore={this.props.userstore}
          drag={drag}
        />
        <ImagesLoadingStatus imagestore={this.props.imagestore}
                             userstore={this.props.userstore}/>
        <Popup userstore={this.props.userstore}
               toolstore={this.props.toolstore}/>
        <div style={this.importSheetButtonStyle}
             data-content={this.props.userstore.getText('importImages')}
             ref='import'
             className='ui container'>
          <a style={this.importSheetButtonIconStyle} onClick={ModalActions.showModal.bind(null, ModalConstants.Modals.addToSet, {parent: this.props.benchstore.getActiveSetId()})}
          className='ui green button' >
            <i className='ui large icons'>
              <i className='folder icon'/>
              <i className='corner big black add icon'/>
            </i>

          </a>
        </div>
        <OrbalContextMenu
          menustore={this.props.menustore}
          ministore={this.props.ministore}
          metastore={this.props.metastore}
          userstore={this.props.userstore}
          benchstore={this.props.benchstore}
          viewstore={this.props.viewstore}
          toolstore={this.props.toolstore}
        />
        <BenchLabBorders
          userstore={this.props.userstore}
          viewstore={this.props.viewstore}
        />
        <EntityFilters
          userstore={this.props.userstore}
          viewstore={this.props.viewstore}
          benchstore={this.props.benchstore}
        />
        <BenchLabFreeSpace
          width='100%'
          height='100%'
          viewstore={this.props.viewstore}
          metastore={this.props.metastore}
          modestore={this.props.modestore}
          userstore={this.props.userstore}
          benchstore={this.props.benchstore}
          managerstore={this.props.managerstore}
          drag={drag}
        />
      </div>
    );
  }
}



export default VirtualBenchLab;
