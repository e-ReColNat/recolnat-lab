/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
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
import fr.recolnat.database.utils.BranchUtils;
import fr.recolnat.database.utils.DeleteUtils;
import java.nio.file.AccessDeniedException;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author dmitri
 */
public class Specimen extends AbstractObject {

  private String originalSource = null;
  private final Set<String> images = new HashSet<>();
  private final Set<String> containedInSets = new HashSet<>();

  public Specimen(OrientVertex vSpecimen, OrientVertex vUser, OrientBaseGraph g, RightsManagementDatabase rightsDb) throws AccessForbiddenException {
    super(vSpecimen, vUser, g, rightsDb);
    if (!AccessRights.canRead(vUser, vSpecimen, g, rightsDb)) {
      throw new AccessForbiddenException((String) vUser.getProperty(DataModel.Properties.id), (String) vSpecimen.getProperty(DataModel.Properties.id));
    }

    this.userCanDelete = DeleteUtils.canUserDeleteSubGraph(vSpecimen, vUser, g, rightsDb);
    // Get original source by following forks to the main branch, then get latest version
    OrientVertex vSpecimenMainBranch = null;
    if (BranchUtils.isMainBranch(vSpecimen, g)) {
      // We won't take the latest version here, only the current
      vSpecimenMainBranch = vSpecimen;
    } else {
      vSpecimenMainBranch = BranchUtils.getMainBranchAncestor(vSpecimen, g);
    }
    if (vSpecimenMainBranch != null) {
      OrientVertex vOriginalSource = AccessUtils.findLatestVersion(vSpecimenMainBranch.getVertices(Direction.OUT, DataModel.Links.hasOriginalSource).iterator(), g);
      if(vOriginalSource != null) {
        this.originalSource = vOriginalSource.getProperty(DataModel.Properties.id);
      }
    }

    // Get images
    Iterator<Vertex> itImages = vSpecimen.getVertices(Direction.OUT, DataModel.Links.hasImage).iterator();
    while (itImages.hasNext()) {
      OrientVertex vImage = (OrientVertex) itImages.next();
      if (AccessRights.isLatestVersionAndHasRights(vUser, vImage, DataModel.Enums.AccessRights.READ, g, rightsDb)) {
        images.add((String) vImage.getProperty(DataModel.Properties.id));
      }
    }

    // Get parent sets
    Iterator<Vertex> itParentSets = vSpecimen.getVertices(Direction.IN, DataModel.Links.containsItem).iterator();
    while(itParentSets.hasNext()) {
      OrientVertex vSet = (OrientVertex) itParentSets.next();
      if(AccessRights.isLatestVersionAndHasRights(vUser, vSet, DataModel.Enums.AccessRights.READ, g, rightsDb)) {
        this.containedInSets.add((String) vSet.getProperty(DataModel.Properties.id));
      }
    }
  }

  @Override
  public JSONObject toJSON() throws JSONException {
    JSONObject ret = super.toJSON();
    
    ret.put("originalSource", this.originalSource);
    ret.put("images", this.images);
    ret.put("inSets", this.containedInSets);
    
    return ret;
  }

}
