
'use strict';

import React from 'react';
import d3 from 'd3';

import ContextMenuItem from './ContextMenuItem';

class Path extends ContextMenuItem {
  constructor(props){
    super(props);

    this.state = {
      d3component: null,
      color: null
    };
  }

  beginHilight() {
    var comp = d3.select('#PATH-' + this.props.item.id);
    var color = comp.attr('stroke');
    var newColor = 'blue';
    if(color == 'blue') {
      newColor = 'red';
    }

    this.setState(
      {d3component: comp,
        color: color});

    window.setTimeout(function() {
      ContextMenuItem.blink(comp, color, newColor, 'stroke');
    }, 10);

  }

  endHilight() {
    this.state.d3component.interrupt().transition().attr('stroke', this.state.color);
    this.setState({d3component: null,  color: null});
  }

  componentWillUnmount() {
    if(this.state.d3component) {
      this.state.d3component.interrupt().transition().attr('stroke', this.state.color);
    }
  }

  actions() {
    return <div className='ui inverted flowing popup'>
      <div className='vertical inverted compact menu'>
        <a className='vertically fitted item'>Chemin vers polygone</a>
        <a className='vertically fitted item'>Modifier</a>
        <a className='vertically fitted item'>Ajouter une annotation</a>
        <a className='vertically fitted item'>Supprimer</a>
      </div>
    </div>;
  }
}

export default Path;