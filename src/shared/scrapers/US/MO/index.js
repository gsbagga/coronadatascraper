import * as fetch from '../../../lib/fetch/index.js';
import * as parse from '../../../lib/parse.js';
import * as transform from '../../../lib/transform.js';
import * as geography from '../../../lib/geography/index.js';
import datetime from '../../../lib/datetime/index.js';

// Set county to this if you only have state data, but this isn't the entire state
const UNASSIGNED = '(unassigned)';

const scraper = {
  state: 'iso2:US-MO',
  country: 'iso1:US',
  type: 'table',
  aggregate: 'county',
  url: 'https://health.mo.gov/living/healthcondiseases/communicable/novel-coronavirus/results.php',
  sources: [
    {
      name: 'Missouri Department of Health and Senior Services'
    }
  ],
  maintainers: [
    {
      name: 'Paul Boal',
      email: 'paul.boal@amitechsolutions.com',
      url: 'https://amitechsolutions.com',
      github: 'paulboal',
      country: 'iso1:US',
      flag: '🇺🇸'
    }
  ],
  _countyMap: {
    'Kansas City': 'Jackson County',
    'St Louis': 'St. Louis County',
    'St Charles': 'St. Charles County',
    'St Clair': 'St. Clair County',
    'Ste Genevieve': 'Ste. Genevieve County',
    'St Francois': 'St. Francois County',
    Joplin: 'Jasper County',
    'St Louis City': 'St. Louis City'
  },
  _counties: [
    'Adair County',
    'Andrew County',
    'Atchison County',
    'Audrain County',
    'Barry County',
    'Barton County',
    'Bates County',
    'Benton County',
    'Bollinger County',
    'Boone County',
    'Buchanan County',
    'Butler County',
    'Caldwell County',
    'Callaway County',
    'Camden County',
    'Cape Girardeau County',
    'Carroll County',
    'Carter County',
    'Cass County',
    'Cedar County',
    'Chariton County',
    'Christian County',
    'Clark County',
    'Clay County',
    'Clinton County',
    'Cole County',
    'Cooper County',
    'Crawford County',
    'Dade County',
    'Dallas County',
    'Daviess County',
    'DeKalb County',
    'Dent County',
    'Douglas County',
    'Dunklin County',
    'Franklin County',
    'Gasconade County',
    'Gentry County',
    'Greene County',
    'Grundy County',
    'Harrison County',
    'Henry County',
    'Hickory County',
    'Holt County',
    'Howard County',
    'Howell County',
    'Iron County',
    'Jackson County',
    'Jasper County',
    'Jefferson County',
    'Johnson County',
    'Knox County',
    'Laclede County',
    'Lafayette County',
    'Lawrence County',
    'Lewis County',
    'Lincoln County',
    'Linn County',
    'Livingston County',
    'Macon County',
    'Madison County',
    'Maries County',
    'Marion County',
    'McDonald County',
    'Mercer County',
    'Miller County',
    'Mississippi County',
    'Moniteau County',
    'Monroe County',
    'Montgomery County',
    'Morgan County',
    'New Madrid County',
    'Newton County',
    'Nodaway County',
    'Oregon County',
    'Osage County',
    'Ozark County',
    'Pemiscot County',
    'Perry County',
    'Pettis County',
    'Phelps County',
    'Pike County',
    'Platte County',
    'Polk County',
    'Pulaski County',
    'Putnam County',
    'Ralls County',
    'Randolph County',
    'Ray County',
    'Reynolds County',
    'Ripley County',
    'St. Charles County',
    'St. Clair County',
    'St. Francois County',
    'St. Louis County',
    'St. Louis City',
    'Ste. Genevieve County',
    'Saline County',
    'Schuyler County',
    'Scotland County',
    'Scott County',
    'Shannon County',
    'Shelby County',
    'Stoddard County',
    'Stone County',
    'Sullivan County',
    'Taney County',
    'Texas County',
    'Vernon County',
    'Warren County',
    'Washington County',
    'Wayne County',
    'Webster County',
    'Worth County',
    'Wright County'
  ],
  _getCountyName(countyName) {
    countyName = this._countyMap[countyName] || countyName;

    if (!countyName.toUpperCase().includes(' CITY')) {
      countyName = geography.addCounty(countyName);
    }

    if (countyName === 'TBD County') {
      countyName = UNASSIGNED;
    }

    return countyName;
  },
  scraper: {
    '0': async function() {
      let counties = {};
      const $ = await fetch.page(this, this.url, 'default');
      const $table = $('table').first();

      const $trs = $table.find('tr');
      $trs.each((index, tr) => {
        const $tr = $(tr);
        let countyName = parse.string($tr.find('td:nth-child(1)').text());
        countyName = this._getCountyName(countyName);

        const casesState = parse.number($tr.find('td:nth-child(2)').text()) || 0;
        const casesOther = parse.number($tr.find('td:nth-child(3)').text()) || 0;
        countyName = geography.addCounty(countyName);

        if (countyName === 'TBD County') {
          countyName = UNASSIGNED;
        }

        if (countyName !== ' County') {
          if (countyName in counties) {
            counties[countyName].cases += casesState + casesOther;
          } else {
            counties[countyName] = {
              cases: casesState + casesOther
            };
          }
        }
      });

      const countiesList = transform.objectToArray(counties);
      countiesList.push(transform.sumData(countiesList));
      counties = geography.addEmptyRegions(countiesList, this._counties, 'county');

      return counties;
    },
    '2020-02-22': async function() {
      let counties = {};
      const $ = await fetch.page(this, this.url, 'default');
      const $table = $('table').first();

      const $trs = $table.find('tr');
      $trs.each((index, tr) => {
        const $tr = $(tr);
        let countyName = parse.string($tr.find('td:nth-child(1)').text());
        countyName = this._getCountyName(countyName);

        const casesTotal = parse.number($tr.find('td:nth-child(2)').text()) || 0;

        if (countyName !== ' County') {
          if (countyName in counties) {
            counties[countyName].cases += casesTotal;
          } else {
            counties[countyName] = {
              cases: casesTotal,
              deaths: 0
            };
          }
        }
      });

      if (datetime.scrapeDateIsAfter('2020-03-24')) {
        const $deaths = $('table')
          .eq(1)
          .first();

        const $trsDeaths = $deaths.find('tr');
        $trsDeaths.each((index, tr) => {
          const $tr = $(tr);
          let countyName = parse.string($tr.find('td:nth-child(1)').text());
          countyName = this._getCountyName(countyName);

          const deathsTotal = parse.number($tr.find('td:nth-child(2)').text()) || 0;

          if (countyName !== ' County') {
            if (countyName in counties) {
              counties[countyName].deaths += deathsTotal;
            } else {
              counties[countyName] = {
                deaths: deathsTotal
              };
            }
          }
        });
      }

      const countiesList = transform.objectToArray(counties);
      countiesList.push(transform.sumData(countiesList));
      counties = geography.addEmptyRegions(countiesList, this._counties, 'county');
      return counties;
    },

    '2020-03-30': async function() {
      const counties = {};
      this.url = await fetch.getArcGISCSVURL(this, 6, '6f2a47a25872470a815bcd95f52c2872', 'lpha_boundry');
      const data = await fetch.csv(this, this.url, 'default');

      const unassigned = {
        county: UNASSIGNED,
        cases: 0,
        deaths: 0
      };

      for (const countyData of data) {
        let countyName = parse.string(countyData.NAME);

        if (countyName === 'TBD' || countyName === 'Out of State') {
          unassigned.cases += parse.number(countyData.Cases || 0);
          unassigned.deaths += parse.number(countyData.Deaths || 0);
        } else {
          countyName = this._getCountyName(countyName);

          if (countyName in counties) {
            counties[countyName].cases += parse.number(countyData.Cases || 0);
            counties[countyName].deaths += parse.number(countyData.Deaths || 0);
          } else {
            // On 2020-4-28, MO switched from recording dates as UTC
            // (eg, "2020-04-27T18:13:20.273Z") to epoch (eg,
            // 1585082918049, an _integer_ = milliseconds from Jan 1,
            // 1970).  The Date constructor handles both of these.
            let d = countyData.EditDate;
            // Check if using epoch.
            if (d.match(/^\d+$/)) d = parseInt(d, 10);
            const editDate = new Date(d);
            counties[countyName] = {
              cases: parse.number(countyData.Cases || 0),
              deaths: parse.number(countyData.Deaths || 0),
              publishedDate: editDate.toISOString()
            };
          }
        }
      }
      const countiesList = transform.objectToArray(counties);
      countiesList.push(unassigned);
      countiesList.push(transform.sumData(countiesList));
      return countiesList;
    }
  }
};

export default scraper;
