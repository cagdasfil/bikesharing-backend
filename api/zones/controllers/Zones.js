'use strict';
var Turf = require('@turf/turf');

module.exports = {

    insertZone : async ctx => {

        var newPolygon = Turf.polygon(ctx.request.body.coordinates);
        const zones = await strapi.query('zones').find();

        for(var i =  0 ; i<zones.length ; i++){

            var currentPolygon = zones[i].polygon;
            var intersection = Turf.intersect(newPolygon, currentPolygon);
            
            if(intersection){
                const res = {
                    status : 400,
                    errorCode : -401,
                    message : 'The zone intersects with another zone!'
                };
                return ctx.send(res);
            }
        }
        
        const zone = {
            name : String(ctx.request.body.name),
            address : String(ctx.request.body.address),
            polygon : newPolygon
        };

        try{
            //Insert to zones
            const resData = await strapi.query('zones').create(zone);

            //Return Response
            const res = {
                status : 200,
                data : resData,
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

    updatePolygon : async ctx => {

        var newPolygon = Turf.polygon(ctx.request.body.newCoordinates);
        const zones = await strapi.query('zones').find();

        for(var i =  0 ; i<zones.length ; i++){

            var currentPolygon = zones[i].polygon;
            var intersection = Turf.intersect(newPolygon, currentPolygon);
            
            if(intersection && String(zones[i].id) != String(ctx.request.body.zoneId)){
                console.log(zones[i].id);
                console.log(ctx.request.body.zoneId);
                const res = {
                    status : 400,
                    errorCode : -410,
                    message : 'The zone intersects with another zone!'
                };
                return ctx.send(res);
            }
        }

        try{

            //Insert to zones
            var resData = await Zones.findOneAndUpdate({_id : String(ctx.request.body.zoneId)},{$set: {polygon : newPolygon}},{returnOriginal : false});

            //Return Response
            const res = {
                status : 200,
                data : resData,
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

    closestZone : async ctx => {

        var userLocation = JSON.parse(ctx.params.location);

        userLocation = [userLocation.longitude, userLocation.latitude];
        userLocation = Turf.point(userLocation);

        var centers = [];
        const zones = await strapi.query('zones').find();

        for(var i = 0 ; i< zones.length; i++){

            var currentPolygon  = zones[i].polygon;

            const currentAvails = await strapi.query('bikes').find({lastZoneId : String(zones[i].id), isAvailable : true});
            console.log(currentAvails);
            if(currentAvails.length) centers.push(Turf.centroid(currentPolygon));
        }

        if(!centers.length){
            const res = {
                status : 400,
                errorCode : -420,
                message : 'There is no available bike currently!'
            };
            return ctx.send(res);
        }

        centers = Turf.featureCollection(centers);
        var resData = Turf.nearestPoint(userLocation,centers);

        //Return Response
        const res = {
            status : 200,
            data : resData,
            message : 'OK'
        }; 
        return ctx.send(res);
    },

    withBikes : async ctx => {

        const zones = await strapi.query('zones').find();
        var zonesWithBikes = [];

        for(var i = 0 ; i< zones.length; i++){

            var currentZone = zones[i];
            var center = Turf.centroid(currentZone.polygon);
            var currentAvails = await strapi.query('bikes').find({lastZoneId : currentZone.id, isAvailable : true});
            
            zonesWithBikes.push ({
                currentZone,
                center,
                availableBikeNumber: currentAvails.length
            });
        }
        //Return Response
        const res = {
            status : 200,
            data : zonesWithBikes,
            message : 'OK'
        };  
        return ctx.send(res);
    },
};
