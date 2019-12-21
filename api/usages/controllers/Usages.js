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
        //Check user has min 10 tl
        if(user.balance < 10){
            //Check user has a debt or not if balance == 0
            if(!user.balance){
                const userUsages = await Usages.find({userId : ctx.request.body.userId , isOpen : false}).sort({updatedAt : -1});
                if(userUsages[0]){
                    const inDebt = await Payments.findOne({usageId : userUsages[0]._id, inDebt : true});
                    if(inDebt){
                        const res = {
                            status : 400,
                            errorCode : -103,
                            message : 'You have ' + (inDebt.totalPayment - inDebt.totalPaid) + ' tl debt!'
                        }; 
                        return ctx.send(res);
                    }
                }
            }
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
            await strapi.query('usages').create(usage);

            //Update bike availability
            await Bikes.updateOne({_id : ctx.request.body.bikeId},{$set: {isAvailable : false, lastDockerId : ctx.request.body.dockerId }});

            //Return Response
            const res = {
                status : 200,
                data : usage,
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
        const currentUsage = await Usages.findOne({userId : ctx.request.body.userId , isOpen : true});
        if(!currentUsage){
            const res = {
                status : 404,
                errorCode : -111,
                message : 'You have no any open session!'
            };
            return ctx.send(res);
        }

        try{
            //Update usage record
            await currentUsage.updateOne({$set: {isOpen : false, endDockerId : String(ctx.request.body.dockerId)}}); 

            //Update bike availability
            await Bikes.updateOne({_id : currentUsage.bikeId},{$set: {isAvailable : true, lastDockerId : ctx.request.body.dockerId }});

            //Find total payment
            const finishedUsage = await Usages.findOne({_id : currentUsage._id});
            const timeDifference = (finishedUsage.updatedAt - finishedUsage.createdAt) / (1000 * 60);

            var totalPayment = 0.00;
            //if(timeDifference > 5) totalPayment += 5.00;
            //if(timeDifference > 60) totalPayment += (timeDifference-60)*0.1;
            //if(timeDifference > 1440) totalPayment += (timeDifference-1440)*0.4;
            
            //To test in midterm
            totalPayment += 10.00;
            totalPayment += timeDifference*0.1;


            //Check user balance
            const user = await strapi.query('user','users-permissions').findOne({_id : ctx.request.body.userId});
            var newBalance = user.balance - totalPayment;
            var totalPaid = totalPayment;
            var inDebt = false;
            if(newBalance < 0 ){
                totalPaid = user.balance;
                newBalance = 0;
                inDebt = true;
            }

            //Update user balance
            await strapi.query('user','users-permissions').update({_id : ctx.request.body.userId},{$set: {balance : newBalance}});

            //Create payment fields
            const payment = {
                usageId : finishedUsage._id,
                totalPayment : totalPayment,
                totalPaid : totalPaid,
                inDebt : inDebt
            }

            //Insert to Payments
            await strapi.query('payments').create(payment);

            //Return Response
            const res = {
                status : 200,
                data : payment,
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
    
};
