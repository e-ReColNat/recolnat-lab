package fr.recolnat.database.model.impl;

import com.tinkerpop.blueprints.Direction;
import com.tinkerpop.blueprints.Vertex;
import com.tinkerpop.blueprints.impls.orient.OrientBaseGraph;
import com.tinkerpop.blueprints.impls.orient.OrientVertex;
import fr.recolnat.database.RightsManagementDatabase;
import fr.recolnat.database.exceptions.AccessForbiddenException;
import fr.recolnat.database.model.DataModel;
import fr.recolnat.database.utils.AccessRights;
import fr.recolnat.database.utils.AccessUtils;
import fr.recolnat.database.utils.DeleteUtils;
import java.util.HashSet;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Iterator;
import java.util.Set;
import org.codehaus.jettison.json.JSONArray;

/**
 * Created by Dmitri Voitsekhovitch (dvoitsekh@gmail.com) on 22/05/15.
 */
public class Annotation extends AbstractObject{
    String creator;
    
    Set<String> standards = new HashSet<>();

  private final static Logger log = LoggerFactory.getLogger(Annotation.class);

  public Annotation(OrientVertex v, OrientVertex vUser, OrientBaseGraph g, RightsManagementDatabase rightsDb) throws AccessForbiddenException {
    super(v, vUser, g, rightsDb);
    
    if(!AccessRights.canRead(vUser, v, g, rightsDb)) {
      throw new AccessForbiddenException((String) vUser.getProperty(DataModel.Properties.id), (String) v.getProperty(DataModel.Properties.id));
    }
    
    this.userCanDelete = DeleteUtils.canUserDeleteSubGraph(v, vUser, g, rightsDb);
    this.creator = AccessUtils.getCreatorId(v, g);
    
    Iterator<Vertex> itParents = v.getVertices(Direction.IN, DataModel.Links.hasMeasurement, DataModel.Links.hasAnnotation).iterator();
    while(itParents.hasNext()) {
      OrientVertex vParent = (OrientVertex) itParents.next();
      if(AccessUtils.isLatestVersion(vParent)) {
        if(AccessRights.canRead(vUser, vParent, g, rightsDb)) {
          this.parents.add((String) vParent.getProperty(DataModel.Properties.id));
        }
      }
    }
    
    Iterator<Vertex> itStandards = v.getVertices(Direction.OUT, DataModel.Links.definedAsMeasureStandard).iterator();
    while(itStandards.hasNext()) {
      OrientVertex vStandard = (OrientVertex) itStandards.next();
      if(AccessUtils.isLatestVersion(vStandard)) {
        if(AccessRights.canRead(vUser, vStandard, g, rightsDb)) {
          standards.add((String) vStandard.getProperty(DataModel.Properties.id));
        }
      }
    }
  }

  @Override
  public JSONObject toJSON() throws JSONException {
    JSONObject ret = super.toJSON();
    ret.put("creator", this.creator);
    
    if(!standards.isEmpty()) {
      ret.put("standards", this.standards);
    }
    
    return ret;
  }
}
