const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

// API 1 list of all states in the state table
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    SELECT
      *
    FROM
      state;`;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});

// API 2 state based on the state ID
app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      *
    FROM
      state
    WHERE
      state_id =${stateId};`;
  const stateArray = await database.get(getStateQuery);
  response.send(convertStateDbObjectToResponseObject(stateArray));
});

//API 3 Create a district in the district table
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const postDistrictQuery = `
  INSERT INTO
    district (state_id, district_name, cases, cured, active, deaths)
  VALUES
    (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths});`;
  await database.run(postDistrictQuery);
  response.send("District Successfully Added");
});

//API 4 district based on the district ID
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictsQuery = `
    SELECT
      *
    FROM
     district
    WHERE
      district_id = ${districtId};`;
  const district = await database.get(getDistrictsQuery);
  response.send(convertDistrictDbObjectToResponseObject(district));
});

//API 5 Deletes a district from district table based on the district ID
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictsQuery = `
    DELETE FROM
     district
    WHERE
      district_id = ${districtId};`;
  const district = await database.run(deleteDistrictsQuery);
  response.send("District Removed");
});

//API 6 Updates the details of a specific district based on district ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const putDistrictQuery = `
    UPDATE
      district
    SET 
      district_name = '${districtName}',
      state_id = ${stateId},
      cases=${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE
      district_id =${districtId};`;
  const district = await database.run(putDistrictQuery);
  response.send("District Details Updated");
});

//API 7 statistics of total cases,cured,active,deaths of a specific state
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateStats = `
  SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    
  FROM 
    district
  WHERE 
    state_id =${stateId};`;
  const stats = await database.get(getStateStats);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//API 8 object containing the state name of district based on district ID
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
  SELECT
    state_name 
  FROM
    district
    NATURAL JOIN
    state
  WHERE 
    district_id = ${districtId};`;
  const state = await database.get(getStateQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
