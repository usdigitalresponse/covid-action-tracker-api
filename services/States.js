'use strict';
const Settings = require('../Settings');
const Fuse = require('fuse.js');
const Logger = require('../utils/Logger');

const fipsToStates = {
    "10": {
        "code": "DE",
        "name": "Delaware"
    },
    "11": {
        "code": "DC",
        "name": "District Of Columbia"
    },
    "12": {
        "code": "FL",
        "name": "Florida"
    },
    "13": {
        "code": "GA",
        "name": "Georgia"
    },
    "14": {
        "code": "GU",
        "name": "Guam"
    },
    "15": {
        "code": "HI",
        "name": "Hawaii"
    },
    "16": {
        "code": "ID",
        "name": "Idaho"
    },
    "17": {
        "code": "IL",
        "name": "Illinois"
    },
    "18": {
        "code": "IN",
        "name": "Indiana"
    },
    "19": {
        "code": "IA",
        "name": "Iowa"
    },
    "20": {
        "code": "KS",
        "name": "Kansas"
    },
    "21": {
        "code": "KY",
        "name": "Kentucky"
    },
    "22": {
        "code": "LA",
        "name": "Louisiana"
    },
    "23": {
        "code": "ME",
        "name": "Maine"
    },
    "24": {
        "code": "MD",
        "name": "Maryland"
    },
    "25": {
        "code": "MA",
        "name": "Massachusetts"
    },
    "26": {
        "code": "MI",
        "name": "Michigan"
    },
    "27": {
        "code": "MN",
        "name": "Minnesota"
    },
    "28": {
        "code": "MS",
        "name": "Mississippi"
    },
    "29": {
        "code": "MO",
        "name": "Missouri"
    },
    "30": {
        "code": "MT",
        "name": "Montana"
    },
    "31": {
        "code": "NE",
        "name": "Nebraska"
    },
    "32": {
        "code": "NV",
        "name": "Nevada"
    },
    "33": {
        "code": "NH",
        "name": "New Hampshire"
    },
    "34": {
        "code": "NJ",
        "name": "New Jersey"
    },
    "35": {
        "code": "NM",
        "name": "New Mexico"
    },
    "36": {
        "code": "NY",
        "name": "New York"
    },
    "37": {
        "code": "NC",
        "name": "North Carolina"
    },
    "38": {
        "code": "ND",
        "name": "North Dakota"
    },
    "39": {
        "code": "OH",
        "name": "Ohio"
    },
    "40": {
        "code": "OK",
        "name": "Oklahoma"
    },
    "41": {
        "code": "OR",
        "name": "Oregon"
    },
    "42": {
        "code": "PA",
        "name": "Pennsylvania"
    },
    "43": {
        "code": "PR",
        "name": "Puerto Rico"
    },
    "44": {
        "code": "RI",
        "name": "Rhode Island"
    },
    "45": {
        "code": "SC",
        "name": "South Carolina"
    },
    "46": {
        "code": "SD",
        "name": "South Dakota"
    },
    "47": {
        "code": "TN",
        "name": "Tennessee"
    },
    "48": {
        "code": "TX",
        "name": "Texas"
    },
    "49": {
        "code": "UT",
        "name": "Utah"
    },
    "50": {
        "code": "VT",
        "name": "Vermont"
    },
    "51": {
        "code": "VA",
        "name": "Virginia"
    },
    "52": {
        "code": "VI",
        "name": "Virgin Islands"
    },
    "53": {
        "code": "WA",
        "name": "Washington"
    },
    "54": {
        "code": "WV",
        "name": "West Virginia"
    },
    "55": {
        "code": "WI",
        "name": "Wisconsin"
    },
    "56": {
        "code": "WY",
        "name": "Wyoming"
    },
    "01": {
        "code": "AL",
        "name": "Alabama"
    },
    "02": {
        "code": "AK",
        "name": "Alaska"
    },
    "03": {
        "code": "AS",
        "name": "American Samoa"
    },
    "04": {
        "code": "AZ",
        "name": "Arizona"
    },
    "05": {
        "code": "AR",
        "name": "Arkansas"
    },
    "06": {
        "code": "CA",
        "name": "California"
    },
    "07": {
        "code": "CZ",
        "name": "Canal Zone"
    },
    "08": {
        "code": "CO",
        "name": "Colorado"
    },
    "09": {
        "code": "CT",
        "name": "Connecticut"
    }
}

class States {

    constructor(){
        
        this.data = [
            {
                "name": "Alabama",
                "code": "AL"
            },
            {
                "name": "Alaska",
                "code": "AK"
            },
            {
                "name": "American Samoa",
                "code": "AS"
            },
            {
                "name": "Arizona",
                "code": "AZ"
            },
            {
                "name": "Arkansas",
                "code": "AR"
            },
            {
                "name": "California",
                "code": "CA"
            },
            {
                "name": "Colorado",
                "code": "CO"
            },
            {
                "name": "Connecticut",
                "code": "CT"
            },
            {
                "name": "Delaware",
                "code": "DE"
            },
            {
                "name": "District Of Columbia",
                "code": "DC"
            },
            {
                "name": "Federated States Of Micronesia",
                "code": "FM"
            },
            {
                "name": "Florida",
                "code": "FL"
            },
            {
                "name": "Georgia",
                "code": "GA"
            },
            {
                "name": "Guam",
                "code": "GU"
            },
            {
                "name": "Hawaii",
                "code": "HI"
            },
            {
                "name": "Idaho",
                "code": "ID"
            },
            {
                "name": "Illinois",
                "code": "IL"
            },
            {
                "name": "Indiana",
                "code": "IN"
            },
            {
                "name": "Iowa",
                "code": "IA"
            },
            {
                "name": "Kansas",
                "code": "KS"
            },
            {
                "name": "Kentucky",
                "code": "KY"
            },
            {
                "name": "Louisiana",
                "code": "LA"
            },
            {
                "name": "Maine",
                "code": "ME"
            },
            {
                "name": "Marshall Islands",
                "code": "MH"
            },
            {
                "name": "Maryland",
                "code": "MD"
            },
            {
                "name": "Massachusetts",
                "code": "MA"
            },
            {
                "name": "Michigan",
                "code": "MI"
            },
            {
                "name": "Minnesota",
                "code": "MN"
            },
            {
                "name": "Mississippi",
                "code": "MS"
            },
            {
                "name": "Missouri",
                "code": "MO"
            },
            {
                "name": "Montana",
                "code": "MT"
            },
            {
                "name": "Nebraska",
                "code": "NE"
            },
            {
                "name": "Nevada",
                "code": "NV"
            },
            {
                "name": "New Hampshire",
                "code": "NH"
            },
            {
                "name": "New Jersey",
                "code": "NJ"
            },
            {
                "name": "New Mexico",
                "code": "NM"
            },
            {
                "name": "New York",
                "code": "NY"
            },
            {
                "name": "North Carolina",
                "code": "NC"
            },
            {
                "name": "North Dakota",
                "code": "ND"
            },
            {
                "name": "Northern Mariana Islands",
                "code": "MP"
            },
            {
                "name": "Ohio",
                "code": "OH"
            },
            {
                "name": "Oklahoma",
                "code": "OK"
            },
            {
                "name": "Oregon",
                "code": "OR"
            },
            {
                "name": "Palau",
                "code": "PW"
            },
            {
                "name": "Pennsylvania",
                "code": "PA"
            },
            {
                "name": "Puerto Rico",
                "code": "PR"
            },
            {
                "name": "Rhode Island",
                "code": "RI"
            },
            {
                "name": "South Carolina",
                "code": "SC"
            },
            {
                "name": "South Dakota",
                "code": "SD"
            },
            {
                "name": "Tennessee",
                "code": "TN"
            },
            {
                "name": "Texas",
                "code": "TX"
            },
            {
                "name": "Utah",
                "code": "UT"
            },
            {
                "name": "Vermont",
                "code": "VT"
            },
            {
                "name": "Virgin Islands",
                "code": "VI"
            },
            {
                "name": "Virginia",
                "code": "VA"
            },
            {
                "name": "Washington",
                "code": "WA"
            },
            {
                "name": "West Virginia",
                "code": "WV"
            },
            {
                "name": "Wisconsin",
                "code": "WI"
            },
            {
                "name": "Wyoming",
                "code": "WY"
            }
        ];

        this.fuse = new Fuse(this.data, {
            threshold: 0.3,
            keys: ['name', 'code']
        });
    }

    fipsToState(fips){
        return fipsToStates[fips];
    }

    find(str){
        
        if (!str){
            return null;
        }

        try {
            let matches = this.fuse.search(str);
            if (!matches || matches.length == 0){
                return null
            }
            return matches[0].item;
        }
        catch(err){
            Logger.error(err);
            Logger.error(`str = ${str}`)
            process.exit(1)
        }

    }
    
}




if(require.main === module) {

    let hlpr = new States();

    Logger.debug(hlpr.find('va'))
    Logger.debug(hlpr.find('virginia'))
    Logger.debug(hlpr.find('vrginia'))

}
else {
    module.exports = new States();
}
