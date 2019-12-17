'use strict';

/**
 * Read the documentation () to implement custom controller functions
 */

module.exports = {

    startSession: async ctx => {
        //Check user has no bike currently
        const currentUsage = await strapi.query('usages').findOne({userId : ctx.request.body.userId , isOpen : true});
        if(currentUsage){
            const status = 400;
            const error = "Start Session Error!";
            const message = 'Bike ' + currentUsage.bikeId + ' is already in use by you!';
            return ctx.response.send({ status : status, error : error, message : message });
        } 
        
        //Check the bike QR trying to tag
        const bike = await strapi.query('bikes').findOne({barcode : ctx.request.body.qrCode});
        if(!bike){
            const status = 404;
            const error = "Start Session Error!";
            const message = 'Invalid QR Code!';
            return ctx.response.send({ status : status, error : error, message : message });
        }

        //Check the bike availability
        if(!bike.isAvailable){
            const status = 400;
            const error = "Start Session Error";
            const message = 'Bike ' + bike.id + ' is already in use!';
            return ctx.response.send({ status : status, error : error, message : message });
        }
        
        //Create usage fields
        const userId = String(ctx.request.body.userId);
        const bikeId = bike.id;
        const startDockerId = String(ctx.request.body.dockerId);
        const isOpen = true;

        //Create usage record
        //TODO Check Catch
        try{
            await strapi.query('usages').create({
                userId:userId,
                bikeId:bikeId,
                startDockerId:startDockerId,
                isOpen: isOpen
            });
        }catch(err){
            ctx.send({message: err});
        }
        
        //Update bike availability
        //TODO Check Catch
        try{
            await strapi.query('bikes').update({barcode : ctx.request.body.qrCode},{$set: {isAvailable : false}}); 
        }catch(err){
            ctx.send({message: err});
        }

        //Return Response
        const status = 200;
        const message = 'OK';
        return ctx.response.send({ status : status, message : message });
  
    },
    
    endSession: async ctx => {
       
        //Check user has a bike currently
        const currentUsage = await strapi.query('usages').findOne({userId : ctx.request.body.userId , isOpen : true});
        if(!currentUsage){
            const status = 404;
            const error = "End Session Error!";
            const message = 'End Session could not be started due to no open session!';
            return ctx.response.send({ status : status, error : error, message : message });
        }
        
        //Create usage fields
        const endDockerId = String(ctx.request.body.dockerId);

        //Update usage record
        //TODO Check Catch
        try{
            await strapi.query('usages').update({userId : ctx.request.body.userId , isOpen : true},{$set: {
                isOpen : false,
                endDockerId : endDockerId
            }});  
        }catch(err){
            ctx.send({message: err});
        }

        //Update bike availability
        //TODO Check Catch
        try{
            await strapi.query('bikes').update({id : currentUsage.bikeId},{$set: {
                isAvailable : true
            }}); 
        }catch(err){
            ctx.send({message: err});
        }

        //Find total payment
        const finishedUsage = await strapi.query('usages').findOne({id : currentUsage.id});
        const timeDifference = (finishedUsage.updatedAt - finishedUsage.createdAt) / (1000 * 60);
        var totalPayment = 0.00;
        if(timeDifference > 5) totalPayment += 5.00;
        if(timeDifference > 60) totalPayment += (timeDifference-60)*0.1;
        if(timeDifference > 1440) totalPayment += (timeDifference-1440)*0.4;

        //Create payment record
        //TODO Check Catch
        try{
            await strapi.query('payments').create({
                usageId:finishedUsage.id,
                totalPayment:totalPayment,
                isPaid: false
            });
        }catch(err){
            ctx.send({message: err});
        }

        //Return Response
        const status = 200;
        const message = 'OK';
        return ctx.response.send({ status : status, message : message });
    },

    openSession: async ctx => {

        //Find users open session
        const currentUsage = await strapi.query('usages').findOne({userId : ctx.params.userId , isOpen : true});
        if(!currentUsage){
            const status = 404;
            const error = "Open Session Error!";
            const message = 'No open session for user ' + ctx.params.userId + '!';
            return ctx.response.send({ status : status, error : error, message : message });
        }
        //Return Response
        const status = 200;
        const message = 'OK';
        return ctx.response.send({ status : status, data : currentUsage, message : message });
    },
    
};
