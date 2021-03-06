/**
 * Various static callbacks for the context menu.
 *
 * Created by dmitri on 02/03/16.
 */
'use strict';

import d3 from 'd3';

import ViewActions from '../../../actions/ViewActions';
import ModalActions from '../../../actions/ModalActions';

import TypeConstants from '../../../constants/TypeConstants';
import ModalConstants from '../../../constants/ModalConstants';

import ServiceMethods from '../../../utils/ServiceMethods';

import conf from '../../../conf/ApplicationConfiguration';

class OrbOptions {
  static remove(data, errorCallback = null, successCallback = null) {
    if(!confirm("Veuillez confirmer la suppression de l'entité")) {
      return;
    }

    ServiceMethods.remove(data.uid, successCallback);
  }

  static unlinkFromSet(data, errorCallback=null, successCallback=null) {
    //console.log('Entering unlinkFromSet data=' + JSON.stringify(data));
    ModalActions.showModal(ModalConstants.Modals.confirmDelete, data, successCallback, errorCallback);
  }

  static unlinkFromView(data, errorCallback = null, successCallback = null) {
    ModalActions.showModal(ModalConstants.Modals.confirmDelete, data, successCallback, errorCallback);
  }

  static edit(data) {

  }

  static annotate(data) {

  }

  static notAvailable(userstore) {
    alert(userstore.getText('operationNotAvailableInVersion'));
  }

  static showMetadata(data) {
    ViewActions.displayMetadataAboutEntity(data.uid);
  }



  static blink(d3Node, startAttributeValue, endAttributeValue, attributeName) {
    function repeat() {
      d3Node.attr(attributeName, startAttributeValue)
        .transition()
        .duration(1000)
        .ease('linear')
        .attr(attributeName, endAttributeValue)
        .transition()
        .duration(1000)
        .ease('linear')
        .attr(attributeName, startAttributeValue)
        .each('end', repeat);
    }
    repeat();
  }

  static beginAnimation(item) {
    if(!d3.select('#POI-' + item).empty()) {
      var bakRect = d3.select('#POI-' + item).select('rect');

      window.setTimeout(function() {
        OrbOptions.blink(bakRect, 'red', 'blue' , 'fill');
      }, 10);

      return {
        type: TypeConstants.point,
        rect: bakRect,
        rectColor: 'white'
      };
    }
    else if(!d3.select('#PATH-' + item).empty()) {
      var comp = d3.select('#PATH-' + item);
      var color = comp.attr('stroke');
      var newColor = 'blue';
      if(color == 'blue') {
        newColor = 'red';
      }
      window.setTimeout(function() {
        OrbOptions.blink(comp, color, newColor, 'stroke');
      }, 10);

      return {
        type: TypeConstants.trail,
        d3component: comp,
        color: color
      };
    }
    else if(!d3.select('#ROI-' + item).empty()) {
      var comp = d3.select('#ROI-' + item);
      var color = comp.attr('fill');
      var newColor = 'red';
      if(color == 'red') {
        newColor = 'blue';
      }

      window.setTimeout(function() {
        OrbOptions.blink(comp, color, newColor, 'fill');
      }, 10);

      return {
        type: TypeConstants.region,
        d3component: comp,
        color: color
      };
    }
    else if(!d3.select('#IMAGE-' + item).empty()) {
      var comp = d3.select('#IMAGE-' + item);

      window.setTimeout(function() {
        OrbOptions.blink(comp, 1.0, 0.3, 'opacity');
      }, 10);

      return {
        type: TypeConstants.image,
        d3component: comp
      };
    }
    else {
      console.warn('No animation for ' + item);
      return null;
    }
  }

  static stopAnimation(animationData) {
    switch(animationData.type) {
      case TypeConstants.point:
        animationData.rect.interrupt().transition().attr('fill', animationData.rectColor);
        break;
      case TypeConstants.trail:
        animationData.d3component.interrupt().transition().attr('stroke', animationData.color);
        break;
      case TypeConstants.region:
        animationData.d3component.interrupt().transition().attr('fill', animationData.color);
        break;
      case TypeConstants.image:
        animationData.d3component.interrupt().transition().attr('opacity', 1.0);
        break;
      default:
        break;
    }
  }

}

export default OrbOptions;
