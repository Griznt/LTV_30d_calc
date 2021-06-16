import path from 'path';
import xlsx from 'xlsx';
import moment from 'moment/moment';
import { json2csv } from 'json-2-csv';
import fs from 'fs';

moment.updateLocale("en", { week: {
  dow: 1, // First day of week is Monday
}});

function parse() {
      try {
        const excelFilename = path.join(
          __dirname,
          '..',
          'ext',
          'players.xlsx'
        );

        const ANDROID = 'android',
          APPLE = 'apple';

        const mobilePlatform = ANDROID;
        
        const workbook = xlsx.readFile(excelFilename, { type: 'binary',
        cellDates: true,
        cellNF: false,
        cellText: false});
        let players = xlsx.utils.sheet_to_json(
          workbook.Sheets['players'])
          .filter(i => i['Item Purchase Id'] === mobilePlatform && moment(i.SessionStart).isAfter('2018-01-01'))

        console.log(`Total players for ${mobilePlatform}:`, players.length);

        const cohorts = {};
        const uniqueUsers = {};

        players.forEach(player => {
          const deviceId = player.DeviceId;
          if(!uniqueUsers[deviceId])
            uniqueUsers[deviceId] = [];
          uniqueUsers[deviceId].push({
          sessionStart: player.SessionStart,
          timestamp: player.EventTimeStamp,
          price: player['Amount //Amount in USD'] || 1 // player['Price //Local Amount'] + ' ' + player['Cost. local store currency ']
          });
        });

        const users = [];
        
        Object.keys(uniqueUsers).forEach(deviceId => {
          //array
          const events = uniqueUsers[deviceId];
          const minSessionStart = moment.min(events.map(event => moment(event.sessionStart)));
          // if(events.length > 2)
          //   console.log('calculating min sessionStart :', events.map(event => moment(event.sessionStart)), 'result:', minSessionStart, 'for deviceId', deviceId, 'sourceEvents are:',events)
          const cohort = getCohortName(moment(minSessionStart).week(), moment(minSessionStart).weekYear());

          function getCohortName(week, year) {
            let _week = (week < 10) ? '0' + week : week;
            return year + '' + _week;
          }

          const cohortStartDate = moment('01/01/' + minSessionStart.year(), 'DD/MM/YYYY').add((moment(minSessionStart).week() - 1), 'weeks').startOf('isoWeek');
          
          const user = {
            deviceId,
            cohort,
            cohortStartDate,
            events,
            // contributionMargin: events.reduce((sum, current) => {return sum + current.price}, 0)
          }; 
          users.push(user);
   
        })

      users.forEach(user => {
        if(!cohorts[user.cohort])
          cohorts[user.cohort] = [];
        cohorts[user.cohort].push(user);
      });
      const usersDailyMargin = [];
//FIXME!
      Object.keys(cohorts).forEach(key => {
        const cohort = cohorts[key];
        cohort.forEach(user => {
          const {cohortStartDate} = user;
          const userDailyMargin = {};
          user.events.forEach(_event => {
            //calculate day number
            let dayIndex = moment(_event.timestamp).startOf('day').diff(cohortStartDate, 'days');
            if(dayIndex < 100)
              if(dayIndex < 10)
                dayIndex = '00' + dayIndex;
              else
                dayIndex = '0' + dayIndex;
            // if(dayIndex < 0) {

            //   console.log('dayindex', 'between',moment(_event.timestamp).startOf('day') , 'and', cohortStartDate, 'is', dayIndex, _event);

            //   const minSessionStart = moment.min(user.events.map(event => moment(event.sessionStart)));
            //   console.log({minSessionStart}, 'week addition:', (moment(minSessionStart).week() - 1));
            //   console.log('   ---', user.deviceId,  ' ---- ',user.events.map(event => moment(event.sessionStart)),
            //   '         | result: ', cohortStartDate, 'and',  moment('01/01/' + minSessionStart.year(), 'DD/MM/YYYY').add((moment(minSessionStart).week() - 1), 'weeks').startOf('isoWeek'),
            //    'vs', moment.min(user.events.map(event => moment(event.sessionStart))))
            // }
            const contributionMargin = _event.price;
            // console.log({dayIndex, contributionMargin})
            if(!userDailyMargin[dayIndex])
              userDailyMargin[dayIndex] = contributionMargin;
            else userDailyMargin[dayIndex] = userDailyMargin[dayIndex] + contributionMargin;
          });
          usersDailyMargin.push({cohort: key, data: {a_deviceId: user.deviceId, day: userDailyMargin}})
          usersDailyMargin.sort();
        })

      });

      saveInFile(usersDailyMargin, 'result');
      fs.writeFileSync(path.join(
        __dirname,
        '..',
        'result',
        `result.json`
      ), JSON.stringify(usersDailyMargin));
     
     function saveInFile(data, filename) {
      let options = {
        delimiter : {
            wrap  : '"', // Double Quote (") character
            field : ',', // Comma field delimiter
            eol   : '\n' // Newline delimiter
        },
        prependHeader    : true,
        sortHeader       : true,
        excelBOM         : true,
        trimFieldValues  : true,
        emptyFieldValue: 0,
    }; 

      let json2csvCallback = function (err, csv) {
        if (err) throw err;

        fs.writeFileSync(path.join(
          __dirname,
          '..',
          'result',
          `${filename}.csv`
        ), csv, function(err) {
          if (err) {
            return console.error(err);
          }
          console.log(`The file was saved to ${outputFileLocation}!`);
        });
      };
       json2csv(data, json2csvCallback, options);
     }
  

      } catch (error) {
        console.error('Unexpected error while synchronizing players', error);
  }
}
  parse();



