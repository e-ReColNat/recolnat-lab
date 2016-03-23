package fr.recolnat.database.utils;

import com.tinkerpop.blueprints.Edge;
import com.tinkerpop.blueprints.Vertex;
import com.tinkerpop.blueprints.impls.orient.OrientEdge;
import com.tinkerpop.blueprints.impls.orient.OrientGraph;
import com.tinkerpop.blueprints.impls.orient.OrientVertex;
import fr.recolnat.database.model.DataModel;
import fr.recolnat.database.exceptions.AlreadyExistsException;
import org.apache.commons.lang.NotImplementedException;
import org.apache.commons.lang.NullArgumentException;
import org.apache.tools.ant.IntrospectionHelper;

import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Created by Dmitri Voitsekhovitch (dvoitsekh@gmail.com) on 25/03/15.
 */
public class CreatorUtils {
  
  public static String generateName(String prefix) {
    String consonants = "BCDFGHJKLMNPQRSTVWXYZ";
    String vowels = "AEIOU";
    String name = prefix + " ";
    
    Random gen = new Random();
    
    boolean vowel = false;
    for(int i = 0; i < 10; ++i) {
      if(vowel) {
        name = name + vowels.charAt(gen.nextInt(vowels.length()));
      }
      else {
        name = name + consonants.charAt(gen.nextInt(consonants.length()));
      }
      vowel = !vowel;
    }
    
    return name;
  }

  /**
   * Returns a UUID which is not used by any element in the database. This UUID can only be used for Vertex elements and is prefixed by "V-".
   * @param graph
   * @return
   */
  public static String newVertexUUID(OrientGraph graph) {
    String uuid = UUID.randomUUID().toString();
    Iterator<Vertex> itExistingEntities = graph.getVertices("V",
        new String[]{DataModel.Properties.id},
        new Object[]{uuid}).iterator();
    while(itExistingEntities.hasNext()) {
      uuid = UUID.randomUUID().toString();
      itExistingEntities = graph.getVertices("V",
          new String[]{DataModel.Properties.id},
          new Object[]{uuid}).iterator();
    }

    return "V-" + uuid;
  }

  /**
   * Returns a UUID which is not used by any element in the database. This UUID can only be used for Edge elements and is prefixed by "E-".
   * @param graph
   * @return
   */
  public static String newEdgeUUID(OrientGraph graph) {
    String uuid = UUID.randomUUID().toString();
    Iterator<Edge> itExistingEntities = graph.getEdges(DataModel.Properties.id, uuid).iterator();
    while(itExistingEntities.hasNext()) {
      uuid = UUID.randomUUID().toString();
      itExistingEntities = graph.getEdges(DataModel.Properties.id, uuid).iterator();
    }

    return "E-" + uuid;
  }

  /**
   * Creates the abstract scientific entity with the given type and id if it does not already exist. Throws exceptions if it already exists..
   * @param type
   * @param id
   * @param graph
   * @return
   * @throws fr.recolnat.database.exceptions.AlreadyExistsException
   */
  public static OrientVertex createAbstractScientificEntity(String type, String id, OrientGraph graph) throws AlreadyExistsException {
    if(type == null || id == null) {
      throw new NullArgumentException("Input argument 'type' or 'id' is null. This is not allowed.");
    }

    Iterator<Vertex> itExistingEntities = graph.getVertices(DataModel.Classes.externBaseEntity,
        new String[]{DataModel.Properties.id, DataModel.Properties.type},
        new Object[]{id, type}).iterator();
    if(itExistingEntities.hasNext()) {
      throw new AlreadyExistsException(new String[] {DataModel.Properties.id, DataModel.Properties.type});
    }
    OrientVertex ret = graph.addVertex("class:" + DataModel.Classes.externBaseEntity);
    ret.setProperties(DataModel.Properties.type, type,
        DataModel.Properties.id, id, DataModel.Properties.creationDate, (new Date()).getTime());
    return ret;
  }

  /**
   * Creates the abstract ReColNat entity with the given id and properties if no element of the class with the given id exists. Otherwise throws an exception.
   * @param id
   * @param createdInModule
   * @param createdAt
   * @param graph
   * @return
   * @throws fr.recolnat.database.exceptions.AlreadyExistsException
   */
  public static OrientVertex createRecolnatAbstractEntity(String id, DataModel.Enums.Modules createdInModule, Date createdAt, OrientGraph graph) throws AlreadyExistsException {
    if(id == null) {
      throw new NullArgumentException("Input argument 'id' is null. This is not allowed.");
    }

    Iterator<Vertex> itExistingEntities = graph.getVertices(DataModel.Classes.abstractEntity,
        new String[] {DataModel.Properties.id},
        new Object[] {id} ).iterator();
    if(itExistingEntities.hasNext()) {
      throw new AlreadyExistsException(new String[] {DataModel.Properties.id});
    }

    OrientVertex ret = graph.addVertex("class:" + DataModel.Classes.abstractEntity);
    ret.setProperties(DataModel.Properties.id, id,
        DataModel.Properties.createdInModule, createdInModule,
        DataModel.Properties.creationDate, createdAt);
    return ret;
  }

  /**
   * Creates the abstract leaf entity denoted by its id and parameters. If an entity with given id already exists, throws an exception.
   * @param id
   * @param createdInModule
   * @param createdAt
   * @param graph
   * @return
   * @throws fr.recolnat.database.exceptions.AlreadyExistsException
   */
  public static OrientVertex createAbstractLeafEntity (String id, DataModel.Enums.Modules createdInModule, Date createdAt, OrientGraph graph) throws AlreadyExistsException {
    OrientVertex ret = createRecolnatAbstractEntity(id, createdInModule, createdAt, graph);
    ret.moveToClass(DataModel.Classes.leafEntity);
    return ret;
  }

  /**
   * Creates a Relationship between the given source and target while linking it with its creator. The resulting Relationship is a vertex with two incoming edges (from creator and subject) and one outgoing edge (to object). Throws an exception if a Relationship with the given id already exists.
   * @param id
   * @param createdInModule
   * @param user
   * @param createdAt
   * @param type
   * @param relSubject
   * @param relObject
   * @param relName
   * @param relCreator
   * @param graph
   * @return the created vertex
   * @throws AlreadyExistsException
   */
//  public static OrientVertex createRelationship(String id, DataModel.Enums.Modules createdInModule, OrientVertex user, Date createdAt, DataModel.Enums.Relationships type, OrientVertex relSubject, OrientVertex relObject, String relName, OrientVertex relCreator, OrientGraph graph) throws AlreadyExistsException {
//    if(type == null) {
//      throw new NullArgumentException("Input argument 'type' is null. This is not allowed.");
//    }
//
//    OrientVertex ret = CreatorUtils.createRecolnatAbstractEntity("class:" + DataModel.Classes.LevelOneHeirTypes.relationship, createdInModule, createdAt, graph);
//    ret.moveToClass(DataModel.Classes.LevelOneHeirTypes.relationship);
//    ret.setProperties(DataModel.Properties.type, type, DataModel.Properties.name, relName);
//
//    UpdateUtils.addCreator(ret, relCreator, graph);
//    OrientEdge e = graph.addEdge("class:" + DataModel.Links.isLinkedTo, relSubject, ret, relName);
//    e.setProperty(DataModel.Properties.id, CreatorUtils.newEdgeUUID(graph));
//    e.setProperty(DataModel.Properties.creationDate, createdAt);
//    e.setProperty(DataModel.Properties.creator, user.getProperty(DataModel.Properties.id));
//
//    e = graph.addEdge("class:" + DataModel.Links.isLinkedTo, ret, relObject, relName);
//    e.setProperty(DataModel.Properties.id, CreatorUtils.newEdgeUUID(graph));
//    e.setProperty(DataModel.Properties.creationDate, createdAt);
//    e.setProperty(DataModel.Properties.creator, user.getProperty(DataModel.Properties.id));
//    return ret;
//  }

  /**
   *
   * @param id
   * @param createdInModule
   * @param createdAt
   * @param graph
   * @return
   * @throws fr.recolnat.database.exceptions.AlreadyExistsException
   */
  public static OrientVertex createAbstractCompositeEntity(String id, DataModel.Enums.Modules createdInModule, Date createdAt, OrientGraph graph) throws AlreadyExistsException {
    OrientVertex ret = createRecolnatAbstractEntity(id, createdInModule, createdAt, graph);
    ret.moveToClass(DataModel.Classes.compositeEntity);
    return ret;
  }

  /**
   *
   * @param type
   * @param date
   * @param opinionTarget
   * @param opinionSource
   * @param sealOfAuthority
   * @param graph
   * @return
   */
  public static OrientVertex createSentiment(DataModel.Enums.OpinionPolarity type, Date date, OrientVertex opinionTarget, OrientVertex opinionSource, OrientVertex sealOfAuthority, OrientGraph graph) {
    throw new NotImplementedException();
  }

  /**
   *
   * @param className
   * @param id
   * @param createdInModule
   * @param createdAt
   * @param graph
   * @return
   */
  public static OrientVertex createConcreteClass(String className, String id, DataModel.Enums.Modules createdInModule, Date createdAt, OrientGraph graph) {
    throw new NotImplementedException();
  }

  /**
   * Creates a new user.
   * 
   * @param name
   * @param g
   * @return 
   */
  public static OrientVertex createUser(String name, OrientGraph g) {
    OrientVertex user = g.addVertex("class:" + DataModel.Classes.user);
    user.setProperty(DataModel.Properties.id, UUID.randomUUID().toString());
    user.setProperty(DataModel.Properties.name, name);
    user.setProperty(DataModel.Properties.login, name);
    user.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());

    return user;
  }
  
  /**
   * Creates a new user and all data associated with a new user (root set).
   * 
   * @param loginName
   * @param g
   * @return 
   */
  public static OrientVertex createNewUserAndUserData(String loginName, OrientGraph g) {
    OrientVertex vUser = CreatorUtils.createUser(loginName, g);
    OrientVertex vRootSet = CreatorUtils.createSet("Mes espaces de travail", DataModel.Globals.ROOT_SET_ROLE, g);
    OrientVertex vDefaultView = CreatorUtils.createView("Vue par défaut", DataModel.Globals.DEFAULT_VIEW, g);
    UpdateUtils.addCreator(vRootSet, vUser, g);
    UpdateUtils.addCreator(vDefaultView, vUser, g);
    AccessRights.grantAccessRights(vUser, vRootSet, DataModel.Enums.AccessRights.WRITE, g);
    AccessRights.grantAccessRights(vUser, vDefaultView, DataModel.Enums.AccessRights.WRITE, g);
    
    UpdateUtils.link(vRootSet, vDefaultView, DataModel.Links.hasView, (String) vUser.getProperty(DataModel.Properties.id), g);
    
    return vUser;
  }

  public static OrientVertex createSet(String name, String role, OrientGraph g) {
    OrientVertex rootWb = g.addVertex("class:" + DataModel.Classes.set);
    rootWb.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    rootWb.setProperty(DataModel.Properties.name, name);
    rootWb.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());
    rootWb.setProperty(DataModel.Properties.role, role);

    return rootWb;
  }
  
  public static OrientVertex createView(String name, String role, OrientGraph g) {
    OrientVertex vView = g.addVertex("class:" + DataModel.Classes.setView);
    vView.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    vView.setProperty(DataModel.Properties.name, name);
    vView.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());
    vView.setProperty(DataModel.Properties.role, role);
    
    return vView;
  }
  
  public static OrientVertex createImage(String name, String imageUrl, String thumbUrl, OrientGraph g) {
    OrientVertex image = g.addVertex("class:" + DataModel.Classes.image);
    
    image.setProperties(new String[] {DataModel.Properties.id, DataModel.Properties.creationDate, DataModel.Properties.imageUrl, DataModel.Properties.thumbUrl, DataModel.Properties.name},
        new Object[] {CreatorUtils.newVertexUUID(g), (new Date()).getTime(), imageUrl, thumbUrl, name});
    
    return image;
  }
  
  public static OrientVertex createSpecimen(String name, OrientGraph g) {
    OrientVertex specimen = g.addVertex("class:" + DataModel.Classes.specimen);
    
    specimen.setProperties(new String[] {DataModel.Properties.id, DataModel.Properties.creationDate, DataModel.Properties.name},
        new Object[] {CreatorUtils.newVertexUUID(g), (new Date()).getTime(), name});
    
    return specimen;
  }
  
  public static OrientVertex createStudy(String name, OrientVertex creator, OrientGraph g) {
    OrientVertex study = g.addVertex("class:" + DataModel.Classes.study);
    
    study.setProperties(new String[] {DataModel.Properties.id, DataModel.Properties.creationDate, DataModel.Properties.name},
        new Object[] {CreatorUtils.newVertexUUID(g), (new Date()).getTime(), name});
    
    UpdateUtils.addCreator(study, creator, g);
    AccessRights.grantAccessRights(creator, study, DataModel.Enums.AccessRights.WRITE, g);
    
    return study;
  }

  public static OrientVertex createRegionOfInterest(String name, List<List<Integer>> coords, OrientGraph g) {
    OrientVertex polygon = g.addVertex("class:" + DataModel.Classes.regionOfInterest);

    polygon.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    polygon.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());
    polygon.setProperty(DataModel.Properties.name, name);
    polygon.setProperty(DataModel.Properties.vertices, coords);

    return polygon;
  }
  
  public static OrientVertex createOriginalSourceEntity(String id, String source, String type, OrientGraph g) {
    Iterator<Vertex> itWb = g.getVertices(DataModel.Classes.externBaseEntity, 
        new String[] {DataModel.Properties.id, DataModel.Properties.origin, DataModel.Properties.type}, 
        new Object[] {id, source, type})
        .iterator();
    if(itWb.hasNext()) {
      return (OrientVertex) itWb.next();
    }
    
    OrientVertex entity = g.addVertex("class:" + DataModel.Classes.externBaseEntity);
    
    entity.setProperty(DataModel.Properties.id, id);
    entity.setProperty(DataModel.Properties.origin, source);
    entity.setProperty(DataModel.Properties.type, type);
    
    return entity;
  }

  public static OrientVertex createPath(List<List<Integer>> coords, String name, OrientGraph g) {
    OrientVertex path = g.addVertex("class:" + DataModel.Classes.trailOfInterest);

    path.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    path.setProperty(DataModel.Properties.name, name);
    path.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());
    path.setProperty(DataModel.Properties.vertices, coords);

    return path;
  }

  public static OrientVertex createPointOfInterest(Integer x, Integer y, String name, OrientGraph g) {
    OrientVertex pointOfInterest = g.addVertex("class:" + DataModel.Classes.pointOfInterest);

    pointOfInterest.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    pointOfInterest.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());
    pointOfInterest.setProperty(DataModel.Properties.name, name);
    pointOfInterest.setProperty(DataModel.Properties.coordX, x);
    pointOfInterest.setProperty(DataModel.Properties.coordY, y);

    return pointOfInterest;
  }

  public static OrientVertex createAnnotation(String type, OrientGraph g) {
    OrientVertex annotation = g.addVertex("class:" + type);

    annotation.setProperty(DataModel.Properties.id, CreatorUtils.newVertexUUID(g));
    annotation.setProperty(DataModel.Properties.creationDate, (new Date()).getTime());

    return annotation;
  }

  public static OrientVertex createTextAnnotation(String type, String textContent, OrientGraph g) {
    OrientVertex annotation = CreatorUtils.createAnnotation(type, g);

    annotation.setProperty(DataModel.Properties.content, textContent);

    return annotation;
  }

  /**
   * A measure reference is necessarily a length.
   * @param value
   * @param unit Can be m, cm, mm, in. Will ALWAYS be stored as mm
   * @param name
   * @param g
   * @return
   */
  public static OrientVertex createMeasureStandard(Double value, String unit, String name, OrientGraph g) {
    OrientVertex annotation = CreatorUtils.createAnnotation(DataModel.Classes.measureStandard, g);
    if(unit.equalsIgnoreCase("cm")) {
      value = value*10;
    }
    else if(unit.equalsIgnoreCase("m")) {
      value = value*1000;
    }
    else if(unit.equalsIgnoreCase("in")) {
      value = value*25.4;
    }

    annotation.setProperty(DataModel.Properties.unit, "mm");
    annotation.setProperty(DataModel.Properties.length, value);
    annotation.setProperty(DataModel.Properties.name, name);

    return annotation;
  }

  /**
   *
   * @param value
   * @param type See Enums
   * @param g
   * @return
   */
  public static OrientVertex createMeasurement(Double value, DataModel.Enums.Measurement type, OrientGraph g) {
    OrientVertex annotation = CreatorUtils.createAnnotation(DataModel.Classes.measurement, g);

    annotation.setProperty(DataModel.Properties.pxValue, value);
    annotation.setProperty(DataModel.Properties.type, type.value());

    return annotation;
  }
}
