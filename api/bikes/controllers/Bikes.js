'use strict';

module.exports = {

    checkAvailability: async ctx => {

        //Check the bike QR trying to tag
        const bike = await Bikes.findOne({barcode : ctx.params.qrCode});
        if(!bike){  
            const res = {
                status : 404,
                errorCode : -301,
                message : 'Invalid QR Code!'
            }; 
            return ctx.send(res);
        }

        //Check the bike availability
        if(!bike.isAvailable){
            const res = {
                status : 400,
                errorCode : -302,
                message : 'The bike is already in use!'
            }; 
            return ctx.send(res);
        }

        //Return Response
        const res = {
            status : 200,
            data : bike,
            message : 'OK'
        };
        return ctx.send(res); 
    },

    changeLockState: async ctx => {

        //Find the bike
        const bike = await Bikes.findOne({_id : ctx.request.body.bikeId});
        if(!bike){  
            const res = {
                status : 404,
                errorCode : -311,
                message : 'There is no such a bike!'
            }; 
            return ctx.send(res);
        }
        try{
            //Change lock state
            await bike.updateOne({$set: {isLocked : !bike.isLocked}});

        }catch(err){
            const res = {
                status : 304,
                errorCode : -310,
                message : err
            };
            await strapi.query('errors').create(res);
            return ctx.send(res);
        }

        //Return Response
        const res = {
            status : 200,
            data : bike,
            message : 'OK'
        };  
        return ctx.send(res);
    },
};
