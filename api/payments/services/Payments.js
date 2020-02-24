'use strict';

/**
 * Read the documentation () to implement custom service functions
 */

module.exports = {
    
    findDebt: async function(userId,res) {

        //Initiate return value
        res = {
            totalDebt : 0,
            lastPayment : null
        };
            
        //Take payments of user
        var userPayments = await Payments.find({userId : String(userId)}).sort({createdAt : -1});
 
        //Check last payment
        if(userPayments[0]){

            res.totalDebt = userPayments[0].totalFee - userPayments[0].totalPaid;
            res.lastPayment = userPayments[0];
        } 

        //Return response
        return res;

    },
};
