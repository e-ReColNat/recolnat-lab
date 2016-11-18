/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package org.dicen.recolnat.services.core;

import fr.recolnat.database.exceptions.AccessForbiddenException;
import fr.recolnat.database.exceptions.ObsoleteDataException;
import fr.recolnat.database.exceptions.ResourceNotExistsException;
import java.io.IOException;
import java.util.Collection;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import javax.websocket.Session;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import org.dicen.recolnat.services.core.actions.Action;
import org.dicen.recolnat.services.core.actions.ActionResult;
import org.dicen.recolnat.services.core.data.DatabaseResource;
import org.dicen.recolnat.services.core.data.ImageEditorResource;
import org.dicen.recolnat.services.core.data.SetResource;
import org.dicen.recolnat.services.core.data.UserProfileResource;
import org.dicen.recolnat.services.core.data.ViewResource;
import org.dicen.recolnat.services.resources.ColaboratorySocket;
import static org.dicen.recolnat.services.resources.ColaboratorySocket.mapAccessLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 *
 * @author dmitri
 */
public class MessageProcessorThread implements Runnable {

  private static final Logger log = LoggerFactory.getLogger(MessageProcessorThread.class);

  private JSONObject jsonIn = null;
  private Session session = null;
  private String userLogin = null;

  public MessageProcessorThread(Session session, JSONObject message, String userLogin) {
    this.jsonIn = message;
    this.session = session;
    this.userLogin = userLogin;
  }

  @Override
  public void run() {
    Integer messageId;
    try {
      messageId = jsonIn.getInt("messageId");
    } catch (JSONException ex) {
      messageId = null;
    }

    try {
      try {
        int action = jsonIn.getInt("action");
        ActionResult result = null;
        List<String> modified = null;
        // Shared variables that must be declared here otherwise compiler complains
        String entityId, viewId, imageId;
        String name;
        JSONObject payload;
        String elementToCopyId, futureParentId;
        Integer x, y;

        switch (action) {
          case Action.ClientActionType.SUBSCRIBE:
            entityId = jsonIn.getString("id");
            // Get resource data, and check the user has access
            JSONObject entityData = DatabaseResource.getData(entityId, userLogin);
            this.subscribe(session, entityId);
            this.sendResource(entityData, session);
            break;
          case Action.ClientActionType.UNSUBSCRIBE:
            entityId = jsonIn.getString("id");
            this.unsubscribe(session, entityId);
            break;
          case Action.ClientActionType.UPDATE:
            String updateType = jsonIn.getString("actionDetail");
            switch (updateType) {
              case "get-image":
                log.error("Call to get-image should no longer happen in WebSocket");
                break;
              case "get-specimen":
                log.error("Call to get-specimen should no longer happen in WebSocket");
                break;
              case "create-roi":
                imageId = jsonIn.getString("image");
                Double area = jsonIn.getDouble("area");
                Double perimeter = jsonIn.getDouble("perimeter");
                JSONArray vertices = jsonIn.getJSONArray("polygon");
                try {
                  name = jsonIn.getString("name"); // Optional
                } catch (JSONException ex) {
                  name = null;
                }
                result = ImageEditorResource.createRegionOfInterest(imageId, name, area, perimeter, vertices, userLogin);
                modified = result.getModified();
                break;
              case "create-poi":
                imageId = jsonIn.getString("parent");
                x = jsonIn.getInt("x");
                y = jsonIn.getInt("y");
                try {
                  name = jsonIn.getString("name");
                } catch (JSONException ex) {
                  name = null;
                }
                result = ImageEditorResource.createPointOfInterest(imageId, x, y, name, userLogin);
                modified = result.getModified();
                break;
              case "create-toi":
                imageId = jsonIn.getString("parent");
                Double length = jsonIn.getDouble("length");
                JSONArray pathVertices = jsonIn.getJSONArray("path");
                try {
                  name = jsonIn.getString("name");
                } catch (JSONException ex) {
                  name = null;
                }
                result = ImageEditorResource.createTrailOfInterest(imageId, name, length, pathVertices, userLogin);
                modified = result.getModified();
                break;
              case "create-aoi":
                imageId = jsonIn.getString("parent");
                length = jsonIn.getDouble("measure");
                JSONArray angleVertices = jsonIn.getJSONArray("vertices");
                try {
                  name = jsonIn.getString("name");
                } catch (JSONException ex) {
                  name = null;
                }
                result = ImageEditorResource.createAngleOfInterest(imageId, name, length, angleVertices, userLogin);
                modified = result.getModified();
                break;
              case "add-measure-standard":
                String pathId = jsonIn.getString("path");
                Double value = jsonIn.getDouble("value");
                String unit = jsonIn.getString("unit");
                name = jsonIn.getString("name");
                modified = ImageEditorResource.addMeasureStandard(pathId, value, unit, name, userLogin);
                break;
              case "create-set":
                name = jsonIn.getString("name");
                String parentSetId;
                try {
                  parentSetId = jsonIn.getString("parent");
                } catch (JSONException ex) {
                  parentSetId = null;
                }
                result = SetResource.createSet(parentSetId, name, userLogin);
                modified = result.getModified();
                break;
              case "delete-element-from-set":
                String linkId = jsonIn.getString("link");
                modified = SetResource.deleteElementFromSet(linkId, userLogin);
                break;
              case "link":
                elementToCopyId = jsonIn.getString("target");
                futureParentId = jsonIn.getString("destination");
                modified = SetResource.link(elementToCopyId, futureParentId, userLogin);
                break;
              case "copy":
                elementToCopyId = jsonIn.getString("target");
                futureParentId = jsonIn.getString("destination");
                modified = SetResource.copy(elementToCopyId, futureParentId, userLogin);
                break;
              case "cutpaste":
                String currentParentToElementLinkId = jsonIn.getString("link");
                futureParentId = jsonIn.getString("destination");
                modified = SetResource.cutPaste(currentParentToElementLinkId, futureParentId, userLogin);
                break;
              case "import-recolnat-specimen":
                parentSetId = jsonIn.getString("set");
                name = jsonIn.getString("name");
                String recolnatSpecimenUuid = jsonIn.getString("recolnatSpecimenUuid");
                JSONArray images = jsonIn.getJSONArray("images");
                result = SetResource.importRecolnatSpecimen(parentSetId, name, recolnatSpecimenUuid, images, userLogin);
                modified = result.getModified();
                break;
              case "import-external-image":
                parentSetId = jsonIn.getString("set");
                String url = jsonIn.getString("url");
                name = jsonIn.getString("name");
                modified = SetResource.importExternalImage(parentSetId, url, name, userLogin);
                break;
              case "place":
                viewId = jsonIn.getString("view");
                entityId = jsonIn.getString("entity");
                x = jsonIn.getInt("x");
                y = jsonIn.getInt("y");
                modified = ViewResource.placeEntityInView(viewId, entityId, x, y, userLogin);
                break;
              case "move":
                viewId = jsonIn.getString("view");
                linkId = jsonIn.getString("link");
                entityId = jsonIn.getString("entity");
                x = jsonIn.getInt("x");
                y = jsonIn.getInt("y");
                modified = ViewResource.moveEntityInView(viewId, linkId, entityId, x, y, userLogin);
                break;
              case "resize":
                viewId = jsonIn.getString("view");
                linkId = jsonIn.getString("link");
                entityId = jsonIn.getString("entity");
                Integer width = jsonIn.getInt("width");
                Integer height = jsonIn.getInt("height");
                modified = ViewResource.resizeEntityInView(viewId, linkId, entityId, width, height, userLogin);
                break;
              case "remove":
                entityId = jsonIn.getString("id");
                modified = DatabaseResource.remove(entityId, userLogin);
                break;
              case "get-change-log":
                break;
              case "add-annotation":
                entityId = jsonIn.getString("entity");
                String annotationText = jsonIn.getString("text");
                modified = DatabaseResource.addAnnotation(entityId, annotationText, userLogin);
                break;
              case "edit-properties":
                entityId = jsonIn.getString("entity");
                JSONArray properties = jsonIn.getJSONArray("properties");
                modified = DatabaseResource.editProperties(entityId, properties, userLogin);
                break;
            }
            break;
          case Action.ClientActionType.GET:
            String actionDetail = jsonIn.getString("actionDetail");
            switch (actionDetail) {
              case "get-annotations-of-entity":
                entityId = jsonIn.getString("entity");
                result = DatabaseResource.getAnnotationsOfEntity(entityId, userLogin);
                break;
            }
            break;
          case Action.ClientActionType.FEEDBACK:
            String type = jsonIn.getString("type");
            String messageText = jsonIn.getString("text");
            Boolean rsvp = jsonIn.getBoolean("rsvp");
            UserProfileResource.postFeedback(type, messageText, rsvp, userLogin);
            break;
          default:
            log.error("Unhandled action type " + action);
            break;
        }
        // If we are here, no errors occurred, therefore inform client of operation success.
        JSONObject done = new JSONObject();
        done.put("action", Action.ServerActionType.DONE);
        done.put("id", messageId);
        done.put("request", jsonIn);
        if (result != null) {
          done.put("data", result.getResponse());
        }
        session.getAsyncRemote().sendText(done.toString());
        // If the operation modified any resources, inform all listening clients.
        if (modified != null) {
          this.broadcastModifications(modified);
        }
      } catch (IOException e) {
        log.error("I/O exception.", e);
        this.sendInternalServerError(session);
      } catch (AccessForbiddenException ex) {
        JSONObject forbidden = new JSONObject();
        forbidden.put("forbidden", ex.getMessage());
        forbidden.put("action", Action.ServerActionType.DENIED);
        forbidden.put("id", messageId);
        forbidden.put("request", jsonIn);
        session.getAsyncRemote().sendText(forbidden.toString());
      } catch (ObsoleteDataException ex) {
        JSONObject obsolete = new JSONObject();
        obsolete.put("action", Action.ServerActionType.DENIED);
        obsolete.put("obsolete", ex.getObsoleteIdsAsJSON());
        obsolete.put("id", messageId);
        obsolete.put("request", jsonIn);
        session.getAsyncRemote().sendText(obsolete.toString());
      } catch (ResourceNotExistsException ex) {
        JSONObject inputError = new JSONObject();
        inputError.put("action", Action.ServerActionType.DENIED);
        inputError.put("input", ex.getMessage());
        inputError.put("id", messageId);
        inputError.put("request", jsonIn);
        session.getAsyncRemote().sendText(inputError.toString());
      }
    } catch (JSONException | InterruptedException ex) {
      this.sendInternalServerError(session);
    }
  }

  private void sendResource(JSONObject resource, Session session) throws JSONException {
    JSONObject response = new JSONObject();
    response.put("action", Action.ServerActionType.RESOURCE);
    response.put("resource", resource);
    response.put("timestamp", new Date().getTime());

    if (log.isDebugEnabled()) {
      log.debug("Sending resource on subscription " + response.toString());
    }

    session.getAsyncRemote().sendText(response.toString());
  }

  private void broadcastModifications(Collection<String> resourcesModified) throws IOException, JSONException {
    for (String resourceId : resourcesModified) {
      ColaboratorySocket.mapAccessLock.lock();
      try {
        Collection<String> listeners = (Collection<String>) ColaboratorySocket.resourceToSessions.get(resourceId);
        if (listeners != null) {
          Iterator<String> itListeners = listeners.iterator();
          while (itListeners.hasNext()) {
            String sessionId = itListeners.next();
            Session session = ColaboratorySocket.sessionIdToSession.get(sessionId);
            if (session == null) {
              log.error("Session " + sessionId + " is listed as listening to a resource but is not mapped to an existing session");
              continue;
            }

            String userLogin = ColaboratorySocket.sessionIdToUser.get(sessionId);
            JSONObject message = new JSONObject();

            try {
              JSONObject metadata = DatabaseResource.getData(resourceId, userLogin);

              message.put("action", Action.ServerActionType.RESOURCE);
              message.put("timestamp", new Date().getTime());
              message.put("resource", metadata);
            } catch (AccessForbiddenException ex) {
              message.put("forbidden", resourceId);
              message.put("action", Action.ServerActionType.RESOURCE);
            }

            session.getAsyncRemote().sendText(message.toString());
          }
        }
      } finally {
        mapAccessLock.unlock();
      }
    }
  }

  private boolean subscribe(Session session, String entityId) {
    ColaboratorySocket.mapAccessLock.lock();
    try {
      ColaboratorySocket.sessionIdToResources.put(session.getId(), entityId);
      ColaboratorySocket.resourceToSessions.put(entityId, session.getId());
    } finally {
      ColaboratorySocket.mapAccessLock.unlock();
    }
    return true;
  }

  private boolean unsubscribe(Session session, String entityId) {
    ColaboratorySocket.mapAccessLock.lock();
    try {
      Collection mapping = (Collection) ColaboratorySocket.resourceToSessions.get(entityId);
      Iterator<String> itSess = mapping.iterator();
      while (itSess.hasNext()) {
        String sessionId = itSess.next();
        if (sessionId.equals(session.getId())) {
          itSess.remove();
        }
      }

      mapping = (Collection) ColaboratorySocket.sessionIdToResources.get(session.getId());
      Iterator<String> itResources = mapping.iterator();
      while (itResources.hasNext()) {
        String resource = itResources.next();
        if (resource.equals((entityId))) {
          itResources.remove();
        }
      }
    } finally {
      ColaboratorySocket.mapAccessLock.unlock();
    }
    return true;
  }

  private void sendInternalServerError(Session session) {
    session.getAsyncRemote().sendText("500");
  }
}