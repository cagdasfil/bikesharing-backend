'use strict';
var PaymentServices = require('../../payments/services/Payments');
var UsageServices = require('../services/Usages')


module.exports = {

    startSession: async ctx => {

        //Check user
        const user = ctx.state.user;
        if(!user){
            const res = {
                status : 404,
                errorCode : -102,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }


        //Check the user has no bike currently
        const userOpenUsages = await Usages.findOne({userId : user.id, isOpen : true});
        if(userOpenUsages){
            const res = {
                status : 400,
                errorCode : -101,
                message : 'You have already a bike!'
            }; 
            return ctx.send(res);
        }


        //Check user  debt
        if(user.inDebt){
            const lastPayment = await PaymentServices.lastPayment(String(user.id));
            const totalDebt = lastPayment.totalFee - lastPayment.totalPaid;
            const res = {
                status : 400,
                errorCode : -103,
                message : 'You have ' + totalDebt + ' tl debt!'
            }; 
            return ctx.send(res);
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
        
        //Check user location
        const zones = await Zones.find({"polygon.geometry":{$geoIntersects:{$geometry:{"type" : "Point", "coordinates" : ctx.request.body.location}}}}); 
        if(!zones.length){
           const res = {
               status : 400,
               errorCode : -105,
               message : 'You are not on a renting area!'
           };
           return ctx.send(res);
        }

        //Extra check for last zone id for security
        if(ctx.request.body.lastZoneId != zones[0]._id){
            const res = {
               status : 400,
               errorCode : -106,
               message : 'Please select another bike!'
           };
           return ctx.send(res);
       }

       //Create usage fields
        const usage = {
            userId : String(ctx.request.body.userId),
            bikeId : String(ctx.request.body.bikeId),
            startZoneId : String(ctx.request.body.lastZoneId),
            isOpen : true
        };

        try{
            //Insert to Usages
            const responseUsage = await strapi.query('usages').create(usage);

            //Update bike availability
            await Bikes.updateOne({_id : ctx.request.body.bikeId},{$set: {isAvailable : false }});

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

        //Check user
        const user = ctx.state.user;
        if(!user){
            const res = {
                status : 404,
                errorCode : -113,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Check user location
        const zones = await Zones.find({"polygon.geometry":{$geoIntersects:{$geometry:{"type" : "Point", "coordinates" : ctx.request.body.location}}}});
        if(!zones.length){
            const res = {
                status : 400,
                errorCode : -112,
                message : 'You are not on a returning area!'
            };
            return ctx.send(res);
        }
        
        try{

            //Update usage record
            var finishedUsage = await Usages.findOneAndUpdate({userId : String(user.id) , isOpen : true},{$set: {isOpen : false, endZoneId :  String(zones[0].id)}},{returnOriginal : false});
            if(!finishedUsage){
                const res = {
                    status : 404,
                    errorCode : -111,
                    message : 'You have no any open session!'
                };
                return ctx.send(res);
            }

            //Update bike availability 
            await Bikes.updateOne({_id : finishedUsage.bikeId},{$set: {isAvailable : true, lastZoneId : String(zones[0].id)}});

            //Find total usage time
            const timeDifference = (finishedUsage.updatedAt - finishedUsage.createdAt) / (1000 * 60);
            
            //Find total Fee
            const totalFee = await UsageServices.findTotalFee(timeDifference);

            //Check user balance
            var newBalance = user.balance - totalFee;
            var totalPaid = totalFee;
            var inDebt = false;

            if(newBalance < 0 ){
                totalPaid = user.balance;
                newBalance = 0;
                inDebt = true;
            }

            //Update user balance and inDebt field
            const userAfter = await strapi.query('user','users-permissions').update({_id : String(user.id)},{$set: {balance : newBalance, inDebt : inDebt}});

            //Create transaction fields
            const usageTransaction = {
                userId : String(user._id),
                operationType : 'usage',
                details : {
                    usage : finishedUsage,
                    transactionAmount : totalPaid,
                    balanceBefore : user.balance,
                    balanceAfter : userAfter.balance
                }
            };

            //Insert transaction record
            await strapi.query('transactions').create(usageTransaction);

            //Create payment fields
            const payment = {
                userId : String(user.id),
                usage : finishedUsage,
                totalPaid : totalPaid,
                totalFee : totalFee
            }

            //Insert payment record
            await strapi.query('payments').create(payment);

            //Return Response
            const resData = {
                user : userAfter,
                totalFee : totalFee,
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
                errorCode : -131,
                message : 'There is no such a user!'
            };
            return ctx.send(res);
        }

        //Get closed usages of user
        const usages =  await Usages.find({userId : String(ctx.params.userId), isOpen : false}).sort({createdAt : -1});
        if(usages){
            var resData = [];
            for(var i = 0 ; i < usages.length ; i++){
                var startZone = await Zones.findOne({_id : String(usages[i].startZoneId)});
                var endZone = await Zones.findOne({_id : String(usages[i].endZoneId)});
                var currentUsage = usages[i];
                resData.push ({
                    currentUsage,
                    startZone: startZone,
                    endZone: endZone
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
