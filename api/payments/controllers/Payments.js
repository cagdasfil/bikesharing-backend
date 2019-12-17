'use strict';

/**
 * Read the documentation () to implement custom controller functions
 */

module.exports = {

    addMoney: async ctx => {

        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.request.body.userId});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -201,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Check the user balance
        var newBalance = user.balance + ctx.request.body.amount;
        var newTotalPaid = 0;
        var inDebt = false;
        var userPayment = null;
        var withdrawedForDebt = 0;

        //Check user has a debt or not if balance == 0
        if(!user.balance){
            const userUsages = await Usages.find({userId : ctx.request.body.userId , isOpen : false}).sort({updatedAt : -1});
            if(userUsages[0]){
                userPayment = await Payments.findOne({usageId : userUsages[0]._id, inDebt : true});
                console.log(userPayment);
                if(userPayment){

                    withdrawedForDebt = userPayment.totalPayment - userPayment.totalPaid;
                    newTotalPaid = userPayment.totalPaid + withdrawedForDebt;
                    newBalance = newBalance - withdrawedForDebt;
                    
                    if(newBalance < 0){

                        withdrawedForDebt = ctx.request.body.amount;
                        newTotalPaid = userPayment.totalPaid + withdrawedForDebt;
                        newBalance = 0;
                        inDebt = true;
                    }
                }
            }
        }

        try{
            
            //Update user balance
            await strapi.query('user','users-permissions').update({_id : ctx.request.body.userId},{$set: {balance : newBalance}});

            //Update Payment record if needed
            if (userPayment) await userPayment.updateOne({$set: {totalPaid : newTotalPaid, inDebt : inDebt}});

            //Create and Return Response
            const resData = {
                user,
                newBalance : newBalance,
                withdrawedForDebt : withdrawedForDebt
            }
            const res = {
                status : 200,
                data : resData,
                message : 'OK'
            };
            return ctx.send(res);
            
        }catch(err){
            const res = {
                status : 304,
                errorCode : -200,
                message : err
            }; 
            return ctx.send(res);
        }
    },

    withdrawMoney: async ctx => {

        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.request.body.userId});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -211,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Check the user balance
        if(user.balance < ctx.request.body.amount){
            const res = {
                status : 400,
                errorCode : -212,
                message : 'User has ' + user.balance + ' tl!'
            };
            return ctx.send(res);
        }
        
        //Find newBalance
        const newBalance = user.balance - ctx.request.body.amount;

        try{

            //Update user balance
            await strapi.query('user','users-permissions').update({_id : ctx.request.body.userId},{$set: {balance : newBalance}});

            //Create and Return Response
            const resData = {
                user,
                newBalance : newBalance
            }
            const res = {
                status : 200,
                data : resData,
                message : 'OK'
            };
            return ctx.send(res);
            
        }catch(err){
            const res = {
                status : 304,
                errorCode : -210,
                message : err
            }; 
            return ctx.send(res);
        }
    },
};
