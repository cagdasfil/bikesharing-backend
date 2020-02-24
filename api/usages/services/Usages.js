'use strict';

/**
 * Read the documentation () to implement custom service functions
 */

module.exports = {

    findTotalFee : async function(timeDifference, totalPayment){

        totalPayment = 0;
        totalPayment = 15.00 + (timeDifference * 0.1);
        //if(timeDifference > 5) totalPayment += 5.00;
        //if(timeDifference > 60) totalPayment += (timeDifference-60)*0.1;
        //if(timeDifference > 1440) totalPayment += (timeDifference-1440)*0.4;
        return totalPayment;
    },
    
};
