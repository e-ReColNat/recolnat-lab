/**
 * Created by dmitri on 17/05/16.
 */
import request from 'superagent';

import conf from '../conf/ApplicationConfiguration';

export default class REST {
  static createStudy(name, callback = undefined) {
    request.post(conf.actions.studyServiceActions.createStudy)
      .send({name: name})
      .withCredentials()
      .end((err, res) => {
        if(err) {
          console.error(err);
          alert('La création a échoué : ' + err);
        }
        else {
          // Reload studies
          callback();
        }
      });
  }

  static createSubSet(parentId, setName, onSuccessCallback = undefined, onErrorCallback = undefined) {
    request.post(conf.actions.setServiceActions.createSet)
      .send({
        name: setName,
        parent: parentId
      })
      .withCredentials()
      .end((err, res) => {
        if(err) {
          console.error(err);
          if(onErrorCallback) {
            onErrorCallback();
          }
          alert('La création a échoué : ' + err);
        }
        else {
          // Reload studies
          var response = JSON.parse(res.text);
          if(onSuccessCallback) {
            onSuccessCallback(response.parentSet, response.subSet, response.link);
          }
        }
      });
  }

  /**
   * data: array of {entity, view, x, y}
   * @param entityId
   * @param viewId
   * @param x
   * @param y
   * @param onSuccessCallback
   * @param onErrorCallback
   */
  static placeEntityInView(data, onSuccessCallback = undefined, onErrorCallback = undefined) {
    request.post(conf.actions.viewServiceActions.place)
      .send(data)
      .withCredentials()
      .end((err, res) => {
        if(err) {
          console.error('Error placing entities ' + JSON.stringify(data) + ' in view ' + viewId + ' : ' + err);
          if(onErrorCallback) {
            onErrorCallback();
          }
        }
        else {
          if(onSuccessCallback) {
            onSuccessCallback(JSON.parse(res.text));
          }
        }
      })
  }
};