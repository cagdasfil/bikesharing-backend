'use strict';
var PaymentServices = require('../../payments/services/Payments');
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

        //Set as no debt
        var newBalance = user.balance + ctx.request.body.amount;
        var totalPaid = 0;
        var inDebt = false;
        var withdrawedForDebt = 0;

        var lastPayment = null;
        var lastUsage = null;

        //create addMoney Transaction
        const addMoneyTransaction = {
            userId : String(user._id),
            operationType : 'add',
            details : {
                transactionAmount : ctx.request.body.amount,
                balanceBefore : user.balance,
                balanceAfter : newBalance
            }
        };

        //create stoppageTransaction
        var stoppageTransaction = null;

        //Check user has a debt
        if(user.inDebt){
            
            //Find userDebt
            const lastPayment = await PaymentServices.findDebt(String(ctx.request.body.userId));
            const lastUsage = await Usages.findOne({_id : String(lastPayment.lastPayment.usageId)});
            withdrawedForDebt = lastPayment.totalDebt;
            newBalance = newBalance - withdrawedForDebt;
            
            //Set as having debt also after add money
            if(newBalance < 0){

                withdrawedForDebt = ctx.request.body.amount;
                newBalance = 0;
                inDebt = true;
            }

            //Set new totalPaid
            console.log(lastPayment);
            totalPaid = lastPayment.lastPayment.totalPaid + withdrawedForDebt;

            //Set stoppageTransaction
            stoppageTransaction = {
                userId : String(user._id),
                operationType : 'stoppage',
                details : {
                    usage : lastUsage,
                    transactionAmount : withdrawedForDebt,
                    balanceBefore : user.balance + ctx.request.body.amount,
                    balanceAfter : newBalance
                }
            }
            
        }

        try{

            //Insert add Money Transaction
            await strapi.query('transactions').create(addMoneyTransaction);

            //Insert Stoppage record if needed
            if(user.inDebt) await strapi.query('transactions').create(stoppageTransaction);

            //Update totalPaid record if needed
            if(lastPayment) await Payments.updateOne({$set:{totalPaid:totalPaid}});

            //Update user balance and inDebt fields
            await strapi.query('user','users-permissions').update({_id : ctx.request.body.userId},{$set: {balance : newBalance, inDebt : inDebt}});
            

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

        //Create withhdraw transaction data
        const withdrawTransaction = {
            userId : String(user._id),
            operationType : 'withdraw',
            details : {
                transactionAmount : ctx.request.body.amount,
                balanceBefore : user.balance,
                balanceAfter : newBalance
            }
        }

        try{

            //Update user balance
            await strapi.query('user','users-permissions').update({_id : ctx.request.body.userId},{$set: {balance : newBalance}});

            //Insert withdraw Transaction
            await strapi.query('transactions').create(withdrawTransaction);

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

    
    
    
    withDetails : async ctx =>{

        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.params.userId});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -231,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Take user all transactions
        const userTransactions = await Transactions.find({userId : String(user._id)}).sort({createdAt : -1});
        if(userTransactions){
            var resData = [];
            for(var i =0 ; i < userTransactions.length ; i++){
                var currentTransaction = userTransactions[i];
                if(currentTransaction.operationType == 'stoppage' || currentTransaction.operationType == 'usage'){
                    var currentUsage = userTransactions[i].details.usage;
                    var startDocker = await Dockers.findOne({_id : String(currentUsage.startDockerId)});
                    var endDocker = await Dockers.findOne({_id : String(currentUsage.endDockerId)});
                    resData.push({
                        currentTransaction,
                        currentUsage : {
                            currentUsage,
                            startDocker,
                            endDocker
                        }
                    });
                }
                else{
                    resData.push({
                        currentTransaction
                    });
                }
            }
        }
        //Return Response
        const res = {
            status : 200,
            data : userTransactions,
            message : 'OK'
        };
        return ctx.send(res);
        
    
    },
};
