'use strict';
var PaymentServices = require('../services/Payments');

/**
 * Read the documentation () to implement custom controller functions
 */

module.exports = {

    getDebt: async ctx => {

        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.params.userId});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -401,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Check user has a debt
        if(!user.inDebt){
            const res = {
                status : 400,
                errorCode : -402,
                message : 'There is no debt for the user!'
            };
            return ctx.send(res);
        }

        const lastPayment = await PaymentServices.lastPayment(ctx.params.userId);
        const totalDebt = lastPayment.totalFee - lastPayment.totalPaid;

        //Prepare Response Data
        const resData = {
            user,
            totalDebt : totalDebt
        };
 
        //Return Response
        const res = {
            status : 200,
             data : resData,
             message : 'OK'
        };
       
        return ctx.send(res);
    },
};
 