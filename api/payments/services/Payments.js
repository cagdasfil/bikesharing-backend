'use strict';

/**
 * Read the documentation () to implement custom service functions
 */

module.exports = {
    
    lastPayment: async function(userId,res) {

        //Take payments of user
        var userPayments = await Payments.find({userId : String(userId)}).sort({createdAt : -1});
 
        //Check last payment
        if(userPayments[0]){

            res = userPayments[0];
        } 

        //Return response
        return res;

    },
};
