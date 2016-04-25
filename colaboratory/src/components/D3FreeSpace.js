'use strict';

import {EventEmitter} from 'events';
import d3 from 'd3';

import ViewActions from '../actions/ViewActions.js';
import MinimapActions from "../actions/MinimapActions.js";
import ToolActions from "../actions/ToolActions.js";
import MenuActions from '../actions/MenuActions';

import Classes from '../constants/CommonSVGClasses';
import TypeConstants from '../constants/TypeConstants';

import LineMeasure from '../tools/impl/LineMeasure';

import ShapesConf from "../conf/shapes";

import workbenchImageUrl from '../images/book_300.png';
import markerSVG from '../images/marker.svg';

class D3FreeSpace {
  constructor() {
    this.zoom = d3.behavior.zoom()
      //.scaleExtent([0.1, 100])
      .on('zoom', () => {
        ViewActions.updateViewport(
          d3.event.translate[0],
          d3.event.translate[1],
          d3.select('svg').node().parentNode.offsetWidth,
          d3.select('svg').node().parentNode.offsetHeight,
          d3.event.scale
        );
      });

    this.view = {};
    this.view.x = 0;
    this.view.y = 0;
    this.view.scale = 1.0;
    this.metadatastore = null;
    this.benchstore = null;
    this.imageSourceLevel = 0;
    this.loadData = {
      imagesToLoad: 0,
      imagesLoaded: 0
    };

    this._onEndDragFromInbox = () => {
      const addFromInbox = () => this.fixShadow();
      return addFromInbox.apply(this);
    };

    //this.setView = null;
    this.displayData = {
      xMin: Number.POSITIVE_INFINITY,
      xMax: Number.NEGATIVE_INFINITY,
      yMin: Number.POSITIVE_INFINITY,
      yMax: Number.NEGATIVE_INFINITY};
  }

  create(el, props) {
    this.el = el;

    var self = this;
    let svg = d3.select(el).append('svg')
      .attr('width', props.width)
      .attr('height', props.height)
      .on('contextmenu', function(d,i) {
        self.contextMenu.call(this, self);
      })
      .on('click', function(d,i) {
        if (d3.event.button == 0) {
          self.leftClick.call(this, self);
        }
      })
      .on('dragover', function(d, i) {
        d3.event.preventDefault();
      })
      .call(this.zoom)
      .style('cursor', 'default');

    var root = svg.append('g').attr('class', Classes.ROOT_CLASS);
    root.append('g').attr('class', Classes.OBJECTS_CONTAINER_CLASS);
    root.append('g').attr('class', Classes.ACTIVE_TOOL_DISPLAY_CLASS);

  }

  // External methods
  clearDisplay() {
    d3.select("." + Classes.OBJECTS_CONTAINER_CLASS).selectAll("*").remove();
    d3.select("." + Classes.ACTIVE_TOOL_DISPLAY_CLASS).selectAll("*").remove();
  }

  setMetadataStore(store) {
    this.metadatastore = store;
  }

  setLabBenchStore(store) {
    this.benchstore = store;
  }

  newLabBench() {
    this.displayData.xMin = Number.POSITIVE_INFINITY;
    this.displayData.xMax = Number.NEGATIVE_INFINITY;
    this.displayData.yMin = Number.POSITIVE_INFINITY;
    this.displayData.yMax = Number.NEGATIVE_INFINITY;
  }

  loadView(viewId) {
    //this.setView = viewId;
    this.drawChildEntities();
  }

  updateChildEntities() {
    var viewData = this.buildDisplayDataElement();
    if(!viewData) {
      return;
    }
    // Position, transparency
    var children = d3.selectAll('.' + Classes.CHILD_GROUP_CLASS).data(viewData.displays, function(d) {return d.link});

    for(var i = 0; i < viewData.displays.length; ++i) {
      var entity = viewData.displays[i];

      var group = d3.select("#GROUP-" + entity.link);
      var image = d3.select("#NODE-" + entity.link);

      if(group.empty() || image.empty()) {
        continue;
      }

      // Update position
      this.updateAllAttributes(entity.link);

      // TODO Update transparency
    }

    window.setTimeout(function() {
      ViewActions.changeLoaderState(null)},100);
  }

  //updateWorkbenchMetadata(metadata){
  //  // Remove borders around selections
  //  d3.selectAll('.' + Classes.BORDER_CLASS)
  //    .style('fill', '#AAAAAA');
  //  //console.log('updateWbMeta=' + JSON.stringify(metadata));
  //
  //  if(metadata.selected) {
  //    d3.select('#BORDER-' + metadata.selected.uid)
  //      .style('stroke', '#708D23')
  //      .style('fill', '#708D23');
  //
  //    window.setTimeout((function(id) {
  //      return function() {
  //        D3FreeSpace.sendToMinimap(id);
  //      }
  //    })(metadata.selected.uid), 100);
  //  }
  //  else {
  //    window.setTimeout(function() {
  //      MinimapActions.unsetMinimap();
  //    }, 10);
  //  }
  //}

  updateEntitiesMetadata() {
    console.log('updateEntitiesMetadata');
    var bench = this.benchstore.getLabBench();
    if(!bench) {
      return;
    }
    var view = this.metadatastore.getMetadataAbout(this.benchstore.getActiveViewId());
    if(!view) {
      return;
    }

    var pois = [];
    var tois = [];
    var rois = [];
    for(var i = 0 ; i < view.displays; ++i) {
      var entity = view.displays[i];
      var entityId = entity.entity;
      // For each entity get trails, points, regions
      if(bench.images[entityId]) {
        var poiIds = bench.images[entityId].pois;
        var toiIds = bench.images[entityId].tois;
        var roiIds = bench.images[entityId].rois;

        for(var j = 0; j < poiIds.length; ++j) {
          var metadata = JSON.parse(JSON.stringify(this.metadatastore.getMetadataAbout(pois[j])));
          pois.push(metadata);
        }
        this.displayPointsOfInterest(entity.link, pois);

        for(j = 0; j < roiIds.length; ++j) {
          var metadata = JSON.parse(JSON.stringify(this.metadatastore.getMetadataAbout(rois[j])));
          rois.push(metadata);
        }
        this.displayRegionsOfInterest(entity.link, rois);

        for(j = 0; j < toiIds.length; ++j) {
          var metadata = JSON.parse(JSON.stringify(this.metadatastore.getMetadataAbout(tois[j])));
          tois.push(metadata);
        }
        this.displayTrailsOfInterest(entity.link, tois);
      }
    }
  }

  updateViewWithProperties(properties) {
    console.log('updateView');
    d3.selectAll('.' + Classes.POI_CLASS)
      .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')scale(' + properties.sizeOfTextAndObjects + ')');

    d3.selectAll('.' + LineMeasure.classes().selfDataContainerClass).attr('transform', d => 'translate(' + (d.x2 + d.x1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ',' + (d.y2 + d.y1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ')scale(' + properties.sizeOfTextAndObjects + ')');

    //d3.selectAll('.' + LineMeasure.classes().selfRectSvgClass).attr('transform', d => 'translate(' + (d.x2 + d.x1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ',' + (d.y2 + d.y1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ')scale(' + properties.sizeOfTextAndObjects + ')');
    //d3.selectAll('.' + LineMeasure.classes().selfTextSvgClass).attr('transform', d => 'translate(' + (d.x2 + d.x1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ',' + (d.y2 + d.y1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ')scale(' + properties.sizeOfTextAndObjects + ')');
    //d3.selectAll('.' + LineMeasure.classes().selfSaveClass).attr('transform', d => 'translate(' + (d.x2 + d.x1 - 10) * (1-properties.sizeOfTextAndObjects) / 2 + ',' + (d.y2 + d.y1 +50) * (1-properties.sizeOfTextAndObjects) / 2 + ')scale(' + properties.sizeOfTextAndObjects + ')');
  }

  fitViewportToData() {
    let group = d3.select('.' + Classes.ROOT_CLASS);

    var scale = 1.0;
    if(this.displayData.xMin == Number.POSITIVE_INFINITY ||
      this.displayData.xMax == Number.NEGATIVE_INFINITY ||
      this.displayData.yMin == Number.POSITIVE_INFINITY ||
      this.displayData.yMax == Number.NEGATIVE_INFINITY ) {
      console.log("Not enough data to calculate fitness");
      return;
    }

    //console.log('xMin=' + this.displayData.xMin);
    //console.log('yMin=' + this.displayData.yMin);
    //console.log('xMax=' + this.displayData.xMax);
    //console.log('yMax=' + this.displayData.yMax);

    // Add 100px offset from borders
    var xLen = this.displayData.xMax - this.displayData.xMin + 600;
    var yLen = this.displayData.yMax - this.displayData.yMin + 600;
    var scaleX = (d3.select('svg').node().parentNode.offsetWidth / xLen);
    var scaleY = (d3.select('svg').node().parentNode.offsetHeight / yLen);
    if (scaleX > scaleY) {
      scale = scaleY;
    }
    else {
      scale = scaleX;
    }

    var x = -(this.displayData.xMin-300)*scale;
    var y = -(this.displayData.yMin-300)*scale;

    window.setTimeout(function() {
        ViewActions.updateViewport(
          x,
          y,
          d3.select('svg').node().parentNode.offsetWidth,
          d3.select('svg').node().parentNode.offsetHeight,
          scale);
      },
      10);
  }

  updateViewport(x, y, width, height, scale) {
    this.view.x = x;
    this.view.y = y;
    this.view.scale = scale;

    this.viewportTransition();
  }

  displayShadow(data) {
    console.log('displayShadow');
    //console.log(JSON.stringify(data));
    if(d3.select('#SHADOW').empty()) {
      d3.select('svg')
        .attr('pointer-events', 'all')
        .on('dragover', function(){D3FreeSpace.updateShadowPosition()});

      window.addEventListener('dragend', this._onEndDragFromInbox);

      d3.select('.' + Classes.OBJECTS_CONTAINER_CLASS)
        .append('g')
        .attr('id', 'SHADOW')
        .datum(data)
        .append('svg:image')
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", d => d.height)
        .attr("width", d => d.width)
        //.attr("xlink:href", d => d.thumbnail)
        .style('opacity', 0.3);

      //var img = new Image();
      //img.onload = function () {
      //  d3.select('#SHADOW').select('image')
      //    .attr("height", this.height)
      //    .attr("width", this.width);
      //};
      //img.src = data.url;

      var appendShadowCallback = function (image) {
        d3.select('#SHADOW').select('image')
          .attr("xlink:href", image.src);
      };

      window.setTimeout(
      ViewActions.loadImage(data.thumbnail, appendShadowCallback.bind(this)),10);
    }
  }

  hideShadow() {
    d3.select('#SHADOW').remove();
    window.removeEventListener('dragend', this._onEndDragFromInbox);
    d3.select('svg')
      .on('dragover', null)
      .on('dragend', null);
  }

  fixShadow() {
    var shadow = d3.select('#SHADOW');
    var data = shadow.datum();
    var image = shadow.select('image');
    var x = parseInt(image.attr('x'))+50;
    var y = parseInt(image.attr('y'))+100;
    //console.log('setting shadow to location (' + x + ',' + y + ')');
    ViewActions.placeEntity(this.benchstore.getActiveViewId(),
      data.uid,
      x,
      y
    );
    this.hideShadow();
  }

//
// Internal methods
//

  static updateShadowPosition() {
    var container = d3.select('.' + Classes.OBJECTS_CONTAINER_CLASS);
    var coords = d3.mouse(container.node());
    //console.log('new shadow coords=' + JSON.stringify(coords));
    d3.select('#SHADOW').select('image')
      .attr('x', coords[0]-50)
      .attr('y', coords[1]-100);
  }

  static sendToMinimap(id) {
    var image = d3.select('#NODE-' + id);
    if(!image.empty()) {
      var url = image.attr("xlink:href");
      var width = image.datum().width;
      var height = image.datum().height;
      var x = image.datum().x;
      var y = image.datum().y;
      if(url && width != null && height !=null  && x != null && y != null) {
        MinimapActions.initMinimap(url, width, height, x, y);
        return;
      }
    }
    window.setTimeout((function(id) {
      return function() {
        D3FreeSpace.sendToMinimap(id);
      }
    })(id), 500);
  }

  viewportTransition() {
    // if the new zoom level is above a certain value, replace thumbnails with full-size images if available
    if(this.view.scale > 0.1 && this.imageSourceLevel != 1) {
      //console.log("Switch to full scale images");
      this.switchImageSources(1);
    }
    else if(this.view.scale < 0.1 && this.imageSourceLevel != 2) {
      //console.log("Switch to thumbnail images");
      this.switchImageSources(2);
    }

    this.zoom.translate([this.view.x, this.view.y]);
    this.zoom.scale(this.view.scale);

    d3.select('.' + Classes.ROOT_CLASS)
      .transition()
      .duration(250)
      .ease('linear')
      .attr('transform', 'translate(' + this.view.x + "," + this.view.y + ")scale(" + this.view.scale + ')');
  }

  switchImageSources(level) {
    var paramName = null;
    switch(level) {
      case 1:
        paramName = 'url';
        break;
      case 2:
        paramName = 'thumburl';
        break;
      default:
        console.log('Unknown image source level ' + level);
        paramName = 'url';
        break;
    }

    this.imageSourceLevel = level;
    d3.selectAll('.' + Classes.CHILD_GROUP_CLASS).select('.' + Classes.IMAGE_CLASS)
      .attr('xlink:href', d => d[paramName] ? d[paramName] : d.url);
  }

  drawChildEntities() {
    console.log('drawChildEntities');
    var self = this;
    let group = d3.select('.' + Classes.OBJECTS_CONTAINER_CLASS);
    var viewData = this.buildDisplayDataElement();
    if(!viewData) {
      return;
    }
    //console.log(JSON.stringify(viewData));

    this.loadData = {};
    this.loadData.imagesToLoad = viewData.displays.length;
    this.loadData.imagesLoaded = 0;

    // Append new entries
    var children = group.selectAll('.' + Classes.CHILD_GROUP_CLASS).data(viewData.displays);
    var childGroupEnter = children.enter().append('g')
      .attr('class', Classes.CHILD_GROUP_CLASS)
      .attr('id', d => 'GROUP-' + d.link)
      .attr('transform', d => 'translate(1000000,1000000)');

    var underChildGroupEnter = childGroupEnter
      .append('g')
      .attr('class', Classes.UNDER_CHILD_CLASS)
      .attr('id', d => 'UNDER-' + d.link);

    underChildGroupEnter.append("rect")
      .attr('class', Classes.BORDER_CLASS)
      .attr('id', d => 'BORDER-' + d.link)
      .attr('x', -4)
      .attr('y', -104)
      .attr('rx', 15)
      .attr('ry', 15)
      .style('fill', '#AAAAAA');

    underChildGroupEnter.append('text')
      .attr('id', d => 'NAME-' + d.link)
      .attr('x', 10)
      .attr('y', -40)
      .attr('dy', '.20em')
      .attr('font-family', 'Verdana')
      .attr('font-size', '80px')
      .attr('fill', 'white')
      .text(d => d.name);

    childGroupEnter
      .append('svg:image')
      .attr('class', Classes.IMAGE_CLASS)
      .attr('id', d => 'NODE-' + d.link)
      .attr("x", 0)
      .attr("y", 0);

    var overChildClassEnter = childGroupEnter.append('g')
      .attr('class', Classes.OVER_CHILD_CLASS)
      .attr('id', d=> 'OVER-' + d.link);

    overChildClassEnter.append('g')
      .attr('class', Classes.ANNOTATIONS_CONTAINER_CLASS)
      .attr('id', d=> 'ANNOTATIONS-' + d.link);

    for(var i = 0; i < viewData.displays.length; ++i) {
      var element = viewData.displays[i];
      window.setTimeout(this.loadImage.bind(self, element), 10);
    }

    if(this.loadData.imagesLoaded >= this.loadData.imagesToLoad) {
      D3FreeSpace.endLoad();
    }
  }

  buildDisplayDataElement() {
    var viewData = JSON.parse(JSON.stringify(this.metadatastore.getMetadataAbout(this.benchstore.getActiveViewId())));
    //console.log(JSON.stringify(viewData));
    if(viewData) {
      for(var j = 0; j < viewData.displays.length; ++j) {
        var posEntity = viewData.displays[j];
        var entityMetadata = this.benchstore.getData(posEntity.entity);
        //var entityMetadata = this.metadatastore.getMetadataAbout(posEntity.entity);
        if(entityMetadata) {
          Object.keys(entityMetadata).forEach(function (key) {
            viewData.displays[j][key] = entityMetadata[key];
          });

          if (posEntity.x && posEntity.y) {
            this.displayData.xMin = Math.min(this.displayData.xMin, posEntity.x - 60);
            this.displayData.yMin = Math.min(this.displayData.yMin, posEntity.y - 60);

            this.displayData.xMax = Math.max(posEntity.width + posEntity.x + 20, this.displayData.xMax);
            this.displayData.yMax = Math.max(posEntity.height + posEntity.y + 20, this.displayData.yMax);
          }
        }
      }
      //console.log(JSON.stringify(viewData));
      return viewData;
    }

    return null;
  }

  static endLoad() {
    window.setTimeout(function() {
      ViewActions.changeLoaderState('Chargement terminé')},10);

    window.setTimeout(function() {
      ViewActions.changeLoaderState(null)},2000);
  }

  loadImage(elt) {
    console.log('loadImage');
    var self = this;
    var displayLoadedImageCallback = function (image) {
      //console.log('loaded ' + JSON.stringify(elt));
      var group = d3.selectAll("." + Classes.CHILD_GROUP_CLASS);

      var url = image.src;

      group.select("#NODE-" + elt.link)
        .attr("height", d => d.height)
        .attr("width", d => d.width)
        .attr("xlink:href", d => d.thumburl ? d.thumburl : d.url);

      group.select("#BORDER-" + elt.link)
        .attr('width', d => d.width + 8)
        .attr('height', d => d.height + 148);

      group.select("#NAME-" + elt.link)
        .attr('width', d => d.width + 8)
        .attr('height', d => d.height + 148);

      this.updateAllAttributes(elt.link);

      //if(elt.x) {
      //  this.displayData.xMax = Math.max(image.width + elt.x + 60, this.displayData.xMax);
      //  this.displayData.yMax = Math.max(image.height + elt.y + 60, this.displayData.yMax);
      //}

      this.fitViewportToData();

      this.loadData.imagesLoaded += 1;
      window.setTimeout(function() {
        ViewActions.changeLoaderState('Chargement des images en cours... ' + self.loadData.imagesLoaded + '/' + self.loadData.imagesToLoad )},10);

      if(this.loadData.imagesLoaded >= this.loadData.imagesToLoad) {
        D3FreeSpace.endLoad();
      }
    };

    window.setTimeout(
      ViewActions.loadImage.bind(null, elt.thumburl, displayLoadedImageCallback.bind(this)),
    10);
  }

  updateAllAttributes(id) {
    // Update displayed positions for all elements.
    // Do not display any non-spatialized elements (null coordinate)
    d3.select('#GROUP-' + id)
      .transition()
      .duration(200)
      .attr('transform', d => !d.x ? null : 'translate(' + d.x + ',' + d.y + ')')
      .attr('display', d => !d.x ? 'none' : null);

    window.setTimeout(function() {
      ToolActions.reset();
    }, 10);
  }

  displayTrailsOfInterest(id, paths) {
    var annotationContainerGroup = d3.select("#ANNOTATIONS-" + id);
    annotationContainerGroup.selectAll('.' + Classes.PATH_CONTAINER_CLASS).remove();
    if(d3.select('#GROUP-' + id).empty()) {
      return;
    }

    var pathContainerGroup = annotationContainerGroup.append('g')
      .attr('class', Classes.PATH_CONTAINER_CLASS)
      .attr('id', 'PATHS-' + id);

    var pathContainerGroupEnter = pathContainerGroup.selectAll('.' + Classes.PATH_CLASS)
      .data(paths);

    pathContainerGroupEnter
      .enter()
      .append('polyline')
      .attr('class', Classes.PATH_CLASS)
      .attr('id', d => 'PATH-' + d.uid)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('points', d => d.vertices)
      .attr('stroke-width', 4);
  }

  displayPointsOfInterest(id, pois) {
    var annotationContainerGroup = d3.select("#ANNOTATIONS-" + id);
    annotationContainerGroup.selectAll("." + Classes.POI_CONTAINER_CLASS).remove();
    if(d3.select('#GROUP-' + id).empty()) {
      return;
    }

    var poiContainerGroup = annotationContainerGroup.append('g')
      .attr('class', Classes.POI_CONTAINER_CLASS)
      .attr('id', 'POIS-' + id);

    var poiContainerGroupEnter = poiContainerGroup.selectAll('.' + Classes.POI_CLASS).data(pois);

    var poiGroupEnter = poiContainerGroupEnter
      .enter()
      .append('g')
      .attr('class', Classes.POI_CLASS)
      .attr('id', d => 'POI-' + d.uid)
      .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');

    //poiGroupEnter.append('svg:title')
    //  .text(d => d.text);

    //poiGroupEnter.append('rect')
    //  .attr('rx', 5)
    //  .attr('ry', 5)
    //  .attr('width', 50)
    //  .attr('height', 30)
    //  .attr("x", -25)
    //  .attr("y", -55)
    //  .attr('fill', d => "rgb(" + JSON.parse(d.color)[0] + "," + JSON.parse(d.color)[1] + "," + JSON.parse(d.color)[2] + ")");

    poiGroupEnter.append('svg:image')
      .attr("height", 60)
      .attr("width", 60)
      .attr('xlink:href', markerSVG)
      .attr("x", -30)
      .attr("y", -60);


    //poiGroupEnter.append('text')
    //  .text(d => d.letters)
    //  .attr('x', 0)
    //  .attr('y', -40)
    //  .attr('dy', '.35em')
    //  .attr('text-anchor', 'middle')
    //  .attr('font-size', '20px')
    //  .attr('font-family', 'sans-serif')
    //  .attr('fill', d => "rgb(" + (255 - JSON.parse(d.color)[0]) + "," + (255 - JSON.parse(d.color)[1]) + "," + (255 - JSON.parse(d.color)[2]) + ")");
  }

  displayRegionsOfInterest(id, regions) {
    var annotationContainerGroup = d3.select("#ANNOTATIONS-" + id);
    annotationContainerGroup.selectAll("." + Classes.ROI_CONTAINER_CLASS).remove();

    var roiContainerGroup = annotationContainerGroup.append('g')
      .attr('class', Classes.ROI_CONTAINER_CLASS)
      .attr('id', 'ROIS-' + id);

    var roiContainerGroupEnter = roiContainerGroup.selectAll('.' + Classes.ROI_CLASS).data(regions);

    roiContainerGroupEnter
      .enter()
      .append('polygon')
      .attr('class', Classes.ROI_CLASS)
      .attr('id', d => 'ROI-' + d.uid)
      .attr('points', d => d.vertices)
      .attr('fill', 'blue')
      .attr('fill-opacity', 0.3);
  }

  findObjectsAtCoords(coordinates) {
    var objects = [];
    if(!this.metadatastore) {
      // Component not even mounted yet
      console.error("Visualisation component not mounted");
      return objects;
    }
    var metastore = this.metadatastore;

    // Find images, use images to narrow search
    var groups = d3.selectAll('.' + Classes.CHILD_GROUP_CLASS);
    groups.each(
      function(d, i) {
        var box = d3.select('#GROUP-' + d.link).node().getBoundingClientRect();

        if(D3FreeSpace.coordsInBoundingBox(coordinates, box)) {
          objects.push({id: d.link, type: TypeConstants.sheet});
          // Process objects in sheet
          var metadata = metastore.getMetadataAbout(d.uid);
          if(metadata) {
            // Find polygons
            if (metadata.rois) {
              for (var m = 0; m < metadata.rois.length; ++m) {
                var polygonId = metadata.rois[m];
                var polygonBox = d3.select('#ROI-' + polygonId).node().getBoundingClientRect();
                if (D3FreeSpace.coordsInBoundingBox(coordinates, polygonBox)) {
                  if (objects.indexOf({id: polygonId, type: TypeConstants.region}) < 0) {
                    objects.push({id: polygonId, type: TypeConstants.region});
                  }
                }
              }
            }

            // Find paths
            if (metadata.tois) {
              for (var j = 0; j < metadata.tois.length; ++j) {
                var pathId = metadata.tois[j];
                var pathBox = d3.select('#PATH-' + pathId).node().getBoundingClientRect();
                if (D3FreeSpace.coordsInBoundingBox(coordinates, pathBox)) {
                  if (objects.indexOf({id: pathId, type: TypeConstants.path}) < 0) {
                    objects.push({id: pathId, type: TypeConstants.path});
                  }
                }
              }
            }

            // Find points
            if (metadata.pois) {
              for (var n = 0; n < metadata.pois.length; ++n) {
                var poiId = metadata.pois[n];
                var poiBox = d3.select('#POI-' + poiId).node().getBoundingClientRect();
                if (D3FreeSpace.coordsInBoundingBox(coordinates, poiBox)) {
                  if (objects.indexOf({id: poiId, type: TypeConstants.point}) < 0) {
                    objects.push({id: poiId, type: TypeConstants.point});
                  }
                }
              }
            }
          }
        }
      }
    );
    return objects;
  }

  static coordsInBoundingBox(coordinates, box) {
    return coordinates[0] > box.left &&
      coordinates[0] < box.right &&
      coordinates[1] > box.top &&
      coordinates[1] < box.bottom;
  }

  leftClick(self) {
    if(d3.event.defaultPrevented) {
      return;
    }
    d3.event.preventDefault();
    var coords = d3.mouse(this);
    var objectsAtEvent = self.findObjectsAtCoords.call(self, coords);
    // TODO input the right data
    ToolActions.runTool(
      coords[0],
      coords[1],
      {
        data: {},
        objects: objectsAtEvent,
        button: d3.event.button
      });
  }

  contextMenu(self) {
    d3.event.preventDefault();
    var coords = d3.mouse(this);
    var objectsAtEvent = self.findObjectsAtCoords([d3.event.clientX, d3.event.clientY]);
    //console.log(JSON.stringify(objectsAtEvent));
    MenuActions.displayContextMenu(d3.event.clientX, d3.event.clientY, objectsAtEvent);
  }

}

export default D3FreeSpace;