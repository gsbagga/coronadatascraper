const arc = require('@architect/functions');
// eslint-disable-next-line
const constants = require('@architect/views/constants');
// eslint-disable-next-line
const template = require('@architect/views/template');
// eslint-disable-next-line
const header = require('@architect/views/header');
// eslint-disable-next-line
const footer = require('@architect/views/footer');
// eslint-disable-next-line
const sidebar = require('@architect/views/sidebar');

// eslint-disable-next-line
const { getName } = require('@architect/views/lib/geography');
// eslint-disable-next-line
const { getContributors } = require('@architect/views/lib/contributors');
// eslint-disable-next-line
const { getClassNames } = require('@architect/views/lib/dom');

const locations = require('./dist/location-map.json');

const locationArray = Object.values(locations);
const timeseries = require('./dist/timeseries.json');
const featureCollection = require('./dist/features.json');

// /:location
async function handle404(req) {
  // Read in the map
  // See if the slug matches
  const { pathParameters } = req;
  const locationString = pathParameters.location.toLowerCase();
  const foundLocation = locations[locationString];
  if (foundLocation) {
    req.location = foundLocation;
    return req;
  }

  return {
    statusCode: 404
  };
}

function findFeature(id) {
  return featureCollection.features.find(feature => feature.properties.id === id);
}

const levelOrder = ['city', 'county', 'state', 'country', 'world'];

function getParentLevel(level) {
  return levelOrder[Math.min(levelOrder.indexOf(level) + 1, levelOrder.length - 1)];
}

function getSiblingLocations(location) {
  const { level } = location;
  const parentLevel = getParentLevel(level);

  if (parentLevel === 'world') {
    console.log('Will not look for siblings of %s', location.name);
    // Ideally, we find adjacent countries
    // Since this is not yet handled, just return the location
    return [location];
  }

  return locationArray.filter(ohterLocation => {
    return ohterLocation.level === level && ohterLocation[parentLevel] === location[parentLevel];
  });
}

function getFeatureCollectionForLocations(subLocations) {
  return {
    type: 'FeatureCollection',
    features: subLocations.map(location => findFeature(location.featureId))
  };
}

function getSingleContributorLink(location) {
  const curators = getContributors(location.curators, { shortNames: true, link: false });
  const sources = getContributors(location.sources, { shortNames: true, link: false });
  const sourceURLShort = location.url.match(/^(?:https?:\/\/)?(?:[^@/\n]+@)?(?:www\.)?([^:/?\n]+)/)[1];
  let html = '';
  html += `<a class="spectrum-Link" target="_blank" href="${location.url}">`;
  if (location.curators) {
    html += `<strong>${curators}</strong>`;
  } else if (location.sources) {
    html += `<strong>${sources}</strong>`;
  } else {
    html += `<strong>${sourceURLShort}</strong>`;
  }
  html += '</a>';
  return html;
}

function renderCaseInfo(label, count, labelClass) {
  return `<h2 class="spectrum-Heading spectrum-Heading--XS ca-LocalData">${label}: <span class="spectrum-Heading--L ca-LocalCount ${labelClass}"> ${count.toLocaleString()}</span></h2>`;
}

function locationDetail(location, lastDate, caseInfo) {
  // <p class="spectrum-Body spectrum-Body--L">Latest confirmed COVID-19 data</p>
  let html = `
<h1 class="spectrum-Heading spectrum-Heading--L ca-LocationTitle">${location.name}</h1>
`;

  html += `<div class="row">
    <div class="col-xs-12 col-sm-6">`;
  html += `<p class="spectrum-Body spectrum-Body--XS ca-LocationMeta">Updated: ${lastDate}</p>`;
  html += `<p class="spectrum-Body spectrum-Body--XS ca-LocationMeta">Data from ${getSingleContributorLink(
    location
  )}</p>`;
  html += `</div>
    <div class="col-xs-12 col-sm-6 end-sm">
      <sp-button quiet variant="secondary">Download</sp-button>
      <sp-button quiet variant="secondary">Share</sp-button>
    </div>
  </div>`;
  html += `<div class="row">`;
  html += `<div class="col-xs-12 col-md-5 col-lg-4">`;

  if (caseInfo.active !== undefined) {
    html += renderCaseInfo('Active Cases', caseInfo.active, 'ca-Active');
  }
  if (caseInfo.cases !== undefined) {
    html += renderCaseInfo('Total cases', caseInfo.cases, 'ca-Total');
  }
  if (caseInfo.deaths !== undefined) {
    html += renderCaseInfo('Deaths', caseInfo.deaths, 'ca-Deaths');
  }
  if (caseInfo.recovered !== undefined) {
    html += renderCaseInfo('Recovered', caseInfo.recovered, 'ca-Recovered');
  }
  if (caseInfo.hospitalized !== undefined && caseInfo.discharged !== undefined) {
    html += renderCaseInfo('Currently hospitalized', caseInfo.hospitalized - caseInfo.discharged, 'ca-Hospitalized');
  }

  html += `</div>
    <div class="col-xs-12 col-md-7 col-lg-8">
      <h2 class="spectrum-Heading spectrum-Heading--M">Timeline</h1>
      <div id="graph" class="ca-Graph"></div>
    </div>
  </div>
  <div class="row">
    <div class="col-xs-12 col-md-12">
      <h2 class="spectrum-Heading spectrum-Heading--M">Map view</h1>
      <div id="map" class="ca-Map"></div>
    </div>
  </div>

  <div class="ca-Callout--Disclaimer">
    <p class="spectrum-Body spectrum-Body--M">
      COVID Atlas is for informational purposes only and does not offer any medical advice. Data <a class="spectrum-Link" href="#">quality and accuracy</a> is subject to <a class="spectrum-Link" href="#">local government sources</a>. Contact your local officials with questions about the data.
    </p>
  </div>

  <div class="ca-Section">
    <div class="row">
      <div class="col-xs-12">
        <h2 class="spectrum-Heading spectrum-Heading--M">Sources</h1>
        <p class="spectrum-Body spectrum-Body--S">
          COVID Atlas pulls information from a variety of openly available world government data sources and curated datasets.
          <strong>Ratings have nothing to do with the accuracy of the data.</strong>
          The ratings for the data sources here are based on how machine-readable, complete, and granular their data is — not on the accuracy or reliability of the information. We’re using a rating system like this because we’re trying to make governments more accountable for their data practices.
        </p>
        <a href="/sources" class="spectrum-Link">Learn more about COVID Atlas sources</a>
      </div>
    </div>
    <div class="row">
      <section class="col-xs-12 col-sm-6 col-md-4">
        <h4 class="spectrum-Heading spectrum-Heading--S">[Data source]</h4>
        <p class="spectrum-Body spectrum-Body--S"> Report card</p>
      </section>

      <section class="col-xs-12 col-sm-6 col-md-8">
        <h4 class="spectrum-Heading spectrum-Heading--S">[Location cross-check]</h4>
        <p class="spectrum-Body spectrum-Body--S"> Cross-Check report for this locations's sources</p>
      </section>
    </div>
  </div>

  <hr>

  <div class="row">
  <section class="ca-Section col-xs-12 col-sm-6 col-md-4">
      <h1 class="spectrum-Heading spectrum-Heading--M">Local resources</h1>
      <p class="spectrum-Body spectrum-Body--M">List of links</p>
    </section>

    <section class="ca-Section col-xs-12 col-sm-6 col-md-4">
      <h1 class="spectrum-Heading spectrum-Heading--M">National resources</h1>
      <p class="spectrum-Body spectrum-Body--M">List of links</p>
    </section>

    <section class="ca-Section col-xs-12 col-sm-6 col-md-4">
      <h1 class="spectrum-Heading spectrum-Heading--M">Global resources</h1>
      <p class="spectrum-Body spectrum-Body--M">List of links</p>
    </section>
  </div>`;

  return html;
}

function filterTimeseries(timeseries, locations) {
  const subTimeseries = {};

  for (const date in timeseries) {
    const dateEntry = {};
    for (const location of locations) {
      dateEntry[location.id] = timeseries[date][location.id];
    }
    subTimeseries[date] = dateEntry;
  }

  return subTimeseries;
}

async function route(req) {
  // Get latest information from timeseries
  const { location } = req;
  const lastDate = Object.keys(timeseries).pop();
  const caseInfo = timeseries[lastDate][location.id];

  // Create a subset feature collection to display on the map
  const siblingLocations = getSiblingLocations(location);
  const subFeatureCollection = getFeatureCollectionForLocations(siblingLocations);
  const siblingTimeseries = filterTimeseries(timeseries, siblingLocations);

  const graphData = [];
  for (const date in timeseries) {
    if (timeseries[date][location.id].cases === 0) {
      continue;
    }
    const obj = {
      ...timeseries[date][location.id],
      date
    };
    graphData.push(obj);
  }

  // Display the information for the location
  return {
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: template(
      `${location.name}`,
      `
${header()}
<div class="spectrum-Site-content">
  ${sidebar()}
  <div class="spectrum-Site-mainContainer spectrum-Typography">
    ${locationDetail(location, lastDate, caseInfo, siblingLocations, subFeatureCollection)}
    <link href="https://api.mapbox.com/mapbox-gl-js/v1.8.1/mapbox-gl.css" rel="stylesheet">
    <script src="https://api.mapbox.com/mapbox-gl-js/v1.8.1/mapbox-gl.js"></script>
    <script src="https://d3js.org/d3.v5.min.js"></script>
    <script src="${arc.static('location-graph.js')}"></script>
    <script src="${arc.static('location-map.js')}"></script>
    <script>
      window.showGraph({
        data: ${JSON.stringify(graphData)}
      });

      window.showMap({
        locations: ${JSON.stringify(siblingLocations)},
        features: ${JSON.stringify(subFeatureCollection)},
        timeseries: ${JSON.stringify(siblingTimeseries)}
      });
    </script>
    ${footer()}
  </div>
</div>
`,
      'ca-Reports'
    )
  };
}

exports.handler = arc.http.async(handle404, route);