'use strict';


module.exports = {

    startSession: async ctx => {

        //Check the user has no bike currently
        const userOpenUsages = await Usages.findOne({userId : ctx.request.body.userId , isOpen : true});
        if(userOpenUsages){
            const res = {
                status : 400,
                errorCode : -101,
                message : 'You have already a bike!'
            }; 
            return ctx.send(res);
        }

        //Check the user balance
        const user = await strapi.query('user','users-permissions').findOne({_id : ctx.request.body.userId});
        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -102,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Check user has debt
        if(!user.balance){
        
            if(user.inDebt){

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
                const res = {
                    status : 400,
                    errorCode : -103,
                    message : 'You have ' + totalDebt + ' tl debt!'
                }; 
                return ctx.send(res);
            }
        }

        //Check user has min 10 tl
        if(user.balance < 10){
            const res = {
                status : 400,
                errorCode : -104,
                message : 'Your balance is under 10 tl!'
            };
            return ctx.send(res);
       }
        
        //Create usage record
        try{
            //Create usage fields
            const usage = {
                userId : String(ctx.request.body.userId),
                bikeId : String(ctx.request.body.bikeId),
                startDockerId : String(ctx.request.body.dockerId),
                isOpen : true
            };

            //Insert to Usages
            const responseUsage = await strapi.query('usages').create(usage);

            //Update bike availability
            await Bikes.updateOne({_id : ctx.request.body.bikeId},{$set: {isAvailable : false, lastDockerId : ctx.request.body.dockerId }});

            //Return Response
            const res = {
                status : 200,
                data : responseUsage,
                message : 'OK'
            }; 
            return ctx.send(res);

        }catch(err){
            const res = {
                status : 304,
                errorCode : -100,
                message : err
            };

            await strapi.query('errors').create(res);
            return ctx.send(res);
        }
    },
    
    endSession: async ctx => {
        
       
        //Check user has a bike currently
        const currentUsage = await Usages.findOne({userId : String(ctx.request.body.userId) , isOpen : true});
        if(!currentUsage){
            const res = {
                status : 404,
                errorCode : -111,
                message : 'You have no any open session!'
            };
            return ctx.send(res);
        }

        try{

            //Update bike availability
            await Bikes.updateOne({_id : currentUsage.bikeId},{$set: {isAvailable : true, lastDockerId : String(ctx.request.body.dockerId) }});

            //Find total payment
            const finishedUsage = await Usages.findOne({_id : String(currentUsage._id)});
            const timeDifference = (finishedUsage.updatedAt - finishedUsage.createdAt) / (1000 * 60);

            var totalPayment = 15.00;
            if(timeDifference > 5) totalPayment += 5.00;
            if(timeDifference > 60) totalPayment += (timeDifference-60)*0.1;
            if(timeDifference > 1440) totalPayment += (timeDifference-1440)*0.4;

            //Update usage record
            await currentUsage.updateOne({$set: {isOpen : false, endDockerId : String(ctx.request.body.dockerId), totalFee : totalPayment}}); 

            //Check user balance
            const user = await strapi.query('user','users-permissions').findOne({_id : String(ctx.request.body.userId)});
            var newBalance = user.balance - totalPayment;
            var totalPaid = totalPayment;
            var inDebt = false;
            if(newBalance < 0 ){
                totalPaid = user.balance;
                newBalance = 0;
                inDebt = true;
            }

            //Update user balance and inDebt field
            const userAfter = await strapi.query('user','users-permissions').update({_id : String(ctx.request.body.userId)},{$set: {balance : newBalance, inDebt : inDebt}});

            //Create transaction fields
            const usageTransaction = {
                userId : String(user._id),
                operationType : 'usage',
                details : {
                    usageId : String(currentUsage._id),
                    transactionAmount : totalPaid,
                    balanceBefore : user.balance,
                    balanceAfter : userAfter.balance
                }
            };

            //Insert to Transactions
            await strapi.query('transactions').create(usageTransaction);

            //Return Response
            const resData = {
                user : userAfter,
                totalPaid : totalPaid
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
                errorCode : -110,
                message : err
            };
            await strapi.query('errors').create(res);
            return ctx.send(res);
        }
    },

    openSession: async ctx => {

        //Find users open session
        const currentUsage = await Usages.findOne({userId : ctx.params.userId , isOpen : true});
        if(!currentUsage){
            const res = {
                status : 404,
                errorCode : -121,
                message : 'You have no any open session!'
            };
            return ctx.send(res);
        }
        //Return Response
        const res = {
            status : 200,
            data : currentUsage,
            message : 'OK'
        };  
        return ctx.send(res);
    },

    closedSessions: async ctx => {

        //Get user
        const user = await strapi.query('user','users-permissions').findOne({_id : String(ctx.params.userId)});

        //Check user
        if(!user){
            const res = {
                status : 404,
                errorCode : -221,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Get closed usages of user
        const usages =  await Usages.find({userId : String(ctx.params.userId), isOpen : false});
        if(usages){
            var resData = [];
            for(var i = 0 ; i < usages.length ; i++){
                var startDocker = await Dockers.findOne({_id : String(usages[i].startDockerId)});
                var endDocker = await Dockers.findOne({_id : String(usages[i].endDockerId)});
                var currentUsage = usages[i];
                resData.push ({
                    currentUsage,
                    startDocker: startDocker,
                    endDocker: endDocker
                });
            }
        }

        //Return Response
        const res = {
            status : 200,
            data : resData,
            message : 'OK'
        };
        return ctx.send(res); 

    },
    
};
