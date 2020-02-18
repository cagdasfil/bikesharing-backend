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

        //Set as no debt
        var newBalance = user.balance + ctx.request.body.amount;
        var totalPaid = 0;
        var inDebt = false;
        var userPayments = null;
        var withdrawedForDebt = 0;

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

            //Take user all usages
            const userUsages = await Usages.find({userId : ctx.request.body.userId , isOpen : false}).sort({updatedAt : -1});
            
            //Find all payments belongs to last usage
            if(userUsages[0]){
                userPayments = await Transactions.find({userId : String(ctx.request.body.userId) ,  
                                                        $or: [ { operationType : 'stoppage' }, { operationType: 'usage' } ] , 
                                                        "details.usageId" : String(userUsages[0]._id) });
                
                //Find totalPaid for last usage
                if(userPayments){
                    for(var i = 0 ; i < userPayments.length ; i++){
                        totalPaid += userPayments[i].details.transactionAmount;
                    }

                    //Set as having debt before add money
                    withdrawedForDebt = userUsages[0].totalFee - totalPaid;
                    newBalance = newBalance - withdrawedForDebt;
                    
                    //Set as having debt also after add money
                    if(newBalance < 0){

                        withdrawedForDebt = ctx.request.body.amount;
                        newBalance = 0;
                        inDebt = true;
                    }

                    stoppageTransaction = {
                        userId : String(user._id),
                        operationType : 'stoppage',
                        details : {
                            usage : userUsages[0],
                            transactionAmount : withdrawedForDebt,
                            balanceBefore : user.balance + ctx.request.body.amount,
                            balanceAfter : newBalance
                        }
                    }
                }
            }
        }

        try{

            //Insert add Money Transaction
            await strapi.query('transactions').create(addMoneyTransaction);

            //Insert Stoppage record if needed
            if (user.inDebt) await strapi.query('transactions').create(stoppageTransaction);

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

    
    getDebt: async ctx =>{

        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.params.userId});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -221,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }
        //Check user has a debt
        if(!user.inDebt){
            const res = {
                status : 400,
                errorCode : -222,
                message : 'There is no debt for the user!'
            };
            return ctx.send(res);
        }
        //Initiate return values
        var totalDebt = 0;
        var userPayments = null;

        //Take user all usages
        const userUsages = await Usages.find({userId : String(user._id) , isOpen : false}).sort({updatedAt : -1});
        
        if(userUsages[0]){

            //set totalDebt as totalFee of last usage
            totalDebt = userUsages[0].totalFee;

            //Find all payments belongs to last usage
            userPayments = await Transactions.find({userId : String(user._id) ,  
                                                    $or: [ { operationType : 'stoppage' }, { operationType: 'usage' } ] , 
                                                    "details.usageId" : String(userUsages[0]._id) });
                
            //Decrease totalDebt with payments before
            if(userPayments){
                for(var i = 0 ; i < userPayments.length ; i++){
                    totalDebt -= userPayments[i].details.transactionAmount;
                }
            }
        }

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
