/**
 * Organises the items in the selected set by grouping them into subsets using the name of each item as sorting criteria.
 *
 * Data object passed to ModalStore must contain :
 *  - id: String UID of the Set to be sorted
 *
 * Created by dmitri on 25/11/16.
 */
'use strict';

import React from 'react';

import AbstractModal from './AbstractModal';

import ModalConstants from '../../constants/ModalConstants';

import ManagerActions from '../../actions/ManagerActions';
import MetadataActions from '../../actions/MetadataActions';
import ModalActions from '../../actions/ModalActions';
import ViewActions from '../../actions/ViewActions';

import ServiceMethods from '../../utils/ServiceMethods';
import SetCreator from '../../utils/SetCreator';

class OrganiseSet extends AbstractModal {
  constructor(props) {
    super(props);

    this.buttonSubTextStyle = {
      fontSize: '10px'
    };

    this.actionBarStyle = {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '10px'
    };

    this.processingStatusStyle = {
      display: 'none',
      height: '200px',
      overflow: 'auto'
    };

    this.optionsStyle = {
      display: ''
    };

    this.state.setDisplayName = null;
    this.state.setId = null;
    this.state.setData = null;
    this.state.newSets = {};
    this.state.entities = {};
    // 0 = not calculated, 1 = sets calculated, ready to run, 2 = running
    this.state.phase = 0;
    this.state.done = 0;
    this.state.log = [];

    this.modalName = ModalConstants.Modals.organiseSet;
  }

  clearState(state) {
    delete state.newSets;
    delete state.entities;
    state.setDisplayName = null;
    state.setId = null;
    state.setData = null;
    state.newSets = {};
    state.entities = {};
    state.phase = 0;
    state.done = 0;
    state.log = [];
  }

  checkKey(event) {
    switch(event.keyCode) {
      case 13:
        this.create();
        break;
      case 27:
        this.cancel();
        break;
    }
  }

  removeAllListeners() {
    if(this.state.setId) {
      this.props.metastore.removeMetadataUpdateListener(this.state.setId, this.storeSetData.bind(this));
    }
    let keys = Object.keys(this.state.entities);
    for(let i = 0; i < keys.length; ++i) {
      let id = keys[i];
      this.props.metastore.removeMetadataUpdateListener(id, this.receiveItem.bind(this, id));
    }
  }

  storeSetData() {
    if(this.state.phase === 2) {
      return;
    }
    let setData = this.props.metastore.getMetadataAbout(this.state.setId);
    if(setData) {
      this.setState({setData: setData, setDisplayName: setData.name});
    }
  }

  receiveItem(id) {
    if(this.state.phase === 2) {
      return;
    }
    if(!this.state.entities[id]) {
      console.warn('Entity no longer stored here ' + id);
      return;
    }
    let meta = this.props.metastore.getMetadataAbout(id);
    meta.link = this.state.entities[id].link;

    let entities = JSON.parse(JSON.stringify(this.state.entities));
    entities[id] = meta;
    this.setState({entities : entities});
  }

  calculateOutput() {
    if(!this.state.setData) {
      alert(this.props.userstore.getText('dataUnavailableRetry'));
      return;
    }

    let entities = [];
    for(let i = 0; i < this.state.setData.items.length; ++i) {
      entities.push(JSON.parse(JSON.stringify(this.state.entities[this.state.setData.items[i].uid])));
    }

    let futureSets = _.groupBy(entities, function(item) {return item.name});
    this.setState({newSets: futureSets, phase: 1});
  }

  run() {
    // Unsubscribe all listeners
    this.removeAllListeners();
    let newSetNames = Object.keys(this.state.newSets);
    for(let i = 0; i < newSetNames.length; ++i) {
      ServiceMethods.createSet(newSetNames[i], this.state.setId, this.setCreated.bind(this, newSetNames[i]));
    }
    this.setState({phase: 2});
  }

  setCreated(setName, msg) {
    let log = JSON.parse(JSON.stringify(this.state.log));
    let sets = JSON.parse(JSON.stringify(this.state.newSets));
    if(msg.clientProcessError) {
      log.push(this.props.userstore.getInterpolatedText('errorCreatingSet', [setName]));
      delete sets[setName];
    }
    else {
      log.push(this.props.userstore.getInterpolatedText('emptySetCreated', [setName]));
      // sets[setName].uid = msg.data.subSet;
      sets[setName] = {
        uid: msg.data.subSet,
        items: sets[setName]
      };
    }
    this.setState({log: log, newSets: sets});
  }

  moveItems(set) {
    if(!set.uid) {
      return;
    }

    for(let i = 0; i < set.items.length; ++i) {
      let item = set.items[i];
      ServiceMethods.cutPaste(item.link, set.uid, this.itemMoved.bind(this, item.name, item.uid));
    }
  }

  itemMoved(name, id, msg) {
    let log = JSON.parse(JSON.stringify(this.state.log));
    if(msg.clientProcessError) {
      log.push(this.props.userstore.getInterpolatedText('errorCopyingEntity', [name, id]));
    }
    else {
      log.push(this.props.userstore.getInterpolatedText('entityCopiedToNewSet', [name, id]));
    }
    this.setState({done: this.state.done + 1, log: log});
  }

  componentDidMount() {
    super.componentDidMount();
  }

  componentWillUpdate(nextProps, nextState) {
    if(!this.state.active && nextState.active) {
      nextState.setId = this.props.modalstore.getTargetData().id;
      if(!nextState.setId) {
        console.error('No set id provided');
        window.setTimeout(ModalActions.showModal.bind(null, null), 10);
      }
      else {
        nextState.setData = this.props.metastore.getMetadataAbout(nextState.setId);
        for(let i = 0; i < nextState.setData.items.length; ++i) {
          let id = nextState.setData.items[i].uid;
          nextState.entities[id] = this.props.metastore.getMetadataAbout(id);
          nextState.entities[id].link = nextState.setData.items[i].link;
        }
        nextState.setDisplayName = nextState.setData.name;

      }
    }

    if(nextState.active) {
      if(nextState.phase === 2 && _.isUndefined(_.find(nextState.newSets, s => s.uid === undefined)) && !nextState.waiting) {
        _.each(nextState.newSets, this.moveItems, this);
        nextState.waiting = true;
      }
    }

    this.processingStatusStyle.display = nextState.phase === 2? '' : 'none';
    this.actionBarStyle.display = nextState.phase === 2? 'none' : '';
    this.optionsStyle.display = nextState.phase === 2? 'none' : '';
    super.componentWillUpdate(nextProps, nextState);
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state.setData) {
      if (this.state.done === this.state.setData.items.length) {
        window.setTimeout(ModalActions.showModal.bind(null, null), 10);
      }
    }

    if(!this.state.active && prevState.active) {
      this.removeAllListeners();
    }
    super.componentDidUpdate(prevProps, prevState);
  }

  componentWillUnmount() {
    super.componentWillUnmount();

  }

  render() {
    let self = this;
    return <div className="ui modal" ref='modal'>
      <i className="close icon" />
      <div className="header">
        {this.props.userstore.getText('organiseSet')}
      </div>
      <div className="content" onKeyUp={this.checkKey.bind(this)}>
        <div className='description' style={this.optionsStyle}>
          <div className='ui text'>
            {this.props.userstore.getInterpolatedText('organiseSetHelp0', [this.state.setDisplayName])}
          </div>
          <div className='ui text'>
            {this.props.userstore.getText('organiseSetHelp1')} {this.props.userstore.getText('name')}
          </div>

          <div className='ui text'>
            <div className='ui orange message'>
              {this.props.userstore.getText('organiseSetHelp3')}
            </div>
            {this.props.userstore.getInterpolatedText('organiseSetHelp2', [Object.keys(this.state.newSets).length, this.state.setDisplayName])}
            {Object.keys(this.state.newSets).map(function(newSetName, index) {
              let setData = self.state.newSets[newSetName];
              return <div key={index}>{self.props.userstore.getInterpolatedText('organiseSetHelp4', [newSetName, setData.length])}</div>
            })}
          </div>
        </div>

        <div className='description' style={this.processingStatusStyle}>
          <div className='ui text'>
            {this.props.userstore.getText('organiseSetHelp5')} {this.props.userstore.getText('name')}
          </div>
          {this.state.log.map(function(line, index) {
            return <div className='ui text' key={index}>
              {line}
            </div>
          })}
        </div>

        <div className="actions" style={this.actionBarStyle}>
          <div className="ui black deny button" onClick={this.cancel.bind(this)}>
            {this.props.userstore.getText('cancel')}
          </div>
          <div className={'ui button' + (this.state.phase < 2? '' :' disabled')}
               onClick={this.calculateOutput.bind(this)}>
            {this.props.userstore.getText('precalculate')}
          </div>
          <div className={"ui positive right labeled icon button" + (this.state.phase === 1? '':' disabled')}
               onClick={this.run.bind(this)}>
            <div className='ui text'>
              {this.props.userstore.getText('apply')}
            </div>
            <i className="checkmark icon" />
          </div>
        </div>
      </div>
    </div>;
  }
}

export default OrganiseSet;
