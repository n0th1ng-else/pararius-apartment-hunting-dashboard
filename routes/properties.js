const express = require("express");
const geolib = require('geolib');
const router = express.Router();
const Db = require("../db");
const config = require("../config");
const {getId} = require("../utils/scrap");
const {COLOR} = require("../utils/colors");
const {getLocationUrl} = require("../utils/map");
const {getTimestamp} = require("../utils/time");
const DistanceService = require("../mapping-service");

const distanceService = new DistanceService(config.commuteAddress, config.commuteMode, config.googleApi);

const db = new Db();

const RESULT_PER_PAGE = config.resultsPerPage;

router.get("(/page-:page)?", function (req, res) {
  const page = req.params.page;
  const properties = db.getProperties("visible")
  let results = properties;
  let totalPages = Math.ceil(properties.length / RESULT_PER_PAGE)
  if (page && page > 0 && page <= totalPages) {
    const initialLocation = (page - 1) * RESULT_PER_PAGE;
    const endLocation = initialLocation + RESULT_PER_PAGE;
    results = results.slice(initialLocation, endLocation);
  }

  let response = {
    total: properties.length,
    count: results.length,
    pages: totalPages,
    properties: results
  }

  res.json(response)
});

router.get("(/(|new|interesting|shortlisted|hidden|all|not_available))?(/page-:page)?", function (req, res) {
  let state = "new"
  if (req.params['0'] && req.params['0'].length > 1) {
    state = req.params['0'].slice(1);
  }
  let properties = db.getProperties(state)
  let page = req.params.page ? req.params.page : 1;
  let totalPages = Math.ceil(properties.length / RESULT_PER_PAGE)
  if (page < 0 || page > totalPages) {
    page = 1;
  }
  const initialLocation = (page - 1) * RESULT_PER_PAGE;
  const endLocation = initialLocation + RESULT_PER_PAGE;
  let results = properties.slice(initialLocation, endLocation);
  let coordinates = results.filter(p => p.coordinates).map(p => {
    return {
      latitude: p.coordinates.lat,
      longitude: p.coordinates.lng
    }
  })
  let centerOfBounds = geolib.getCenterOfBounds(coordinates);

  let response = {
    total: properties.length,
    count: results.length,
    pages: totalPages,
    page: page,
    center: centerOfBounds,
    properties: results
  }
  res.json(response)
});

router.get("/:id", function (req, res) {
  const id = req.params.id;
  res.json(db.getProperty(id))
});

router.put("/:id", function (req, res) {
  const id = req.params.id;
  const state = req.body.state;
  const notes = req.body.notes;
  let update = {}
  if (state == "interesting" || state == "shortlisted" || state == "new") {
    update.state = state;
  }
  if (notes && notes.length > 0 && notes.length < 1000) {
    update.notes = notes;
  }
  if (db.hasProperty(id)) {
    db.updateProperty(id, update)
    res.json({
      id: id,
      update: update
    })
  } else {
    res.status(404).json({
      id: id,
      error: "Id doesn't exist"
    })
  }

});

router.delete("/:id", function (req, res) {
  const id = req.params.id;
  if (db.hasProperty(id)) {
    db.updateProperty(id, {
      state: "hidden"
    })
    res.json({
      id: id,
      state: "hidden"
    })
  } else {
    res.status(404).json({
      id: id,
      error: "Id doesn't exist"
    })
  }
});

router.post("/apartment", (req, res) => {
  const payload = req.body;
  const url = new URL(payload.url)
  const id = getId(url.pathname);
  const zipCode = payload.zip;
  const city = payload.city;


  if (db.hasProperty(id)) {
    res.render("new", {
      ...payload,
      errorMessage: "The apartment is in the list already"
    })
    return;
  }

  const property = {
    id,
    price: Number(payload.price),
    name: payload.title,
    url,
    zipCode: payload.zip,
    city: payload.city,
    neighborhood: payload.neighborhood || "",
    picture: payload.picture || "",
    agentName: payload.aname || "",
    agentUrl: payload.aurl || "",
    surfaceArea: Number(payload.size),
    bedrooms: payload.bedrooms ? Number(payload.bedrooms) : 1,
    furniture: payload.furniture,
    availability: "",
    discoveryDate: getTimestamp(),
    locationUrl: getLocationUrl(zipCode, city),
  }
  console.log(`${COLOR.Dim} Got property: ${property.name} ${property.id} ${COLOR.Reset}`)
  db.addProperty(property)
  distanceService.getDistances(db.getPropertiesWithoutDistance())
  distanceService.getCoordinates(db.getPropertiesWithoutCoordinates());

  res.redirect("/")
})

module.exports = router;