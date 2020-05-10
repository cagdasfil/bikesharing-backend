'use strict';

/**
 * Read the documentation () to implement custom service functions
 */

module.exports = {

    findTotalFee : async function(timeDifference, totalPayment){

        if(timeDifference < 2){
            totalPayment = 0
        }
        else{
            totalPayment = 2.00;
            totalPayment += timeDifference * 0.1;
        }
        return totalPayment;
    },
    
};
