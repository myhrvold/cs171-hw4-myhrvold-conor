/**
 * Modified by Conor Myhrvold on 3/22/14.
 */

var margin = {
    top: 10,
    right: 50,
    bottom: 30,
    left: 50
};

var width = 1060 - margin.left - margin.right;
var height = 800 - margin.bottom - margin.top;

var bbVis = {
    x: 100,
    y: 10,
    w: width-100,
    h: 300
};

//make vis attributes for bar graph svg to right of map
var bbVisDetail = {
    x: 275,
    y: 100,
    w: 250,
    h: 300
};

var detailVis = d3.select("#detailVis").append("svg").attr({
    width:700,
    height:400
})

var canvas = d3.select("#vis").append("svg").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
    })

var svg = canvas.append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });

var projection = d3.geo.albersUsa().translate([width/2,height/2]).precision(.1);
var path = d3.geo.path().projection(projection);

//declare global variables to access from multiple functions
var dataSet = {};
var yScale;
var xScale;
var time_keys;
var max;
var step_size;

function loadStations(data2) {
    d3.csv("../data/NSRDB_StationsMeta.csv",function(error,data){
        
        var keys = Object.keys(data2);       
        time_keys = Object.keys(data2[keys[0]].hourly);        
        
        max = 0; //initialize to 0
        for(i=0;i<keys.length;i++){
            d = data2[keys[i]];
            if(d.sum > max) { //if sum > max
                max = d.sum; //set d.sum to new max
            }
        }
        //console.log("max is:",max);
        
        var max_radius = 10; //set max radius for circles        
        yScale = d3.scale.linear().domain([0,max]).range([0,max_radius]);
        
        var keys = Object.keys(data); //overwrite previous keys variable to what we want for rest of function
        
        for(i=0;i<keys.length;i++){
            var key = keys[i];
            var station = data[key];
            var lon_lat_coords = projection([station["NSRDB_LON(dd)"],station["NSRDB_LAT (dd)"]]); //grab lon,lat & assemble into coords
           
            if(lon_lat_coords != null){
                var usaf = station["USAF"];
                var usaf_data = data2[usaf];
                
                if(usaf_data != null){
                    var cum_sum = usaf_data.sum;
                    
                    svg.append("circle")
                       .attr("class","station_data")
                       .attr("cx",lon_lat_coords[0])
                       .attr("cy",lon_lat_coords[1])
                       .attr("name",station["STATION"])
                       .attr("id",usaf)
                       .attr("cum_sum",cum_sum)
                       .attr("r",yScale(cum_sum))
                       .on("mouseover",function() {
                                                    var array = d3.select(this); 
                                                        array = array[0][0]; //console.log(array);
                                                    var x = array.getAttribute("cx");
                                                    var y = array.getAttribute("cy");
                                                    var name = array.getAttribute("name")+": "+array.getAttribute("cum_sum");
                                                    
                                                    if(zoom_in_or_out == 1){
                                                        svg.append("text").attr("id","tooltip")
                                                                          .attr("x",x)
                                                                          .attr("y",y-10)
                                                                          .style("font-size",3)
                                                                          .text(name);}
                                                                          
                                                    if(zoom_in_or_out == 0){
                                                        svg.append("text").attr("id","tooltip")
                                                                          .attr("x",x)
                                                                          .attr("y",y-10)
                                                                          .style("font-size",12)
                                                                          .text(name);} })  
                                                                      
                       .on("mouseout", function() {d3.select("#tooltip").remove();})

                       .on("click", function() {var node = d3.select(this); 
                                                node = node[0][0]; 
                                                var name = node.getAttribute("name");
                                                var usaf = node.getAttribute("id");
                                                var data3 = data2[usaf];
                                                updateDetailVis(data3,name)});
                }                
                else {
                    svg.append("circle")
                       .attr("class","station_nodata")              
                       .attr("cx",lon_lat_coords[0])
                       .attr("cy",lon_lat_coords[1])
                       .attr("name",station["STATION"])
                       .attr("id",usaf)
                       .attr("r",2)
                       .on("mouseover",function() { var array = d3.select(this); 
                                                        array = array[0][0]; //console.log(array);
                                                    var x = array.getAttribute("cx");
                                                    var y = array.getAttribute("cy");
                                                    var name = array.getAttribute("name");
                                                    console.log("zoom", zoom_in_or_out);
                                                    if(zoom_in_or_out == 1){
                                                        console.log("option 1");
                                                        svg.append("text").attr("id","tooltip")
                                                                          .attr("x",x)
                                                                          .attr("y",y-10)
                                                                          .style("font-size",3)
                                                                          .text(name);}
                                                                          
                                                    if(zoom_in_or_out == 0){
                                                        console.log("option 2");
                                                        svg.append("text").attr("id","tooltip")
                                                                          .attr("x",x)
                                                                          .attr("y",y-10)
                                                                          .style("font-size",12)
                                                                          .text(name);} })                                                    
                                                                      
                        .on("mouseout", function() { d3.select("#tooltip").remove() ;});                         
                }
            }
        }
        
        max = 13000000; //max for bar heights -- otherwise max is too high & would need to loop through all of my bars to find maximum.
        createDetailVis();
    });
}


function loadStats() {
    d3.json("../data/reducedMonthStationHour2003_2004.json", function(error,data){ 
        loadStations(data);
    })
}


d3.json("../data/us-named.json", function(error, data) {

    var usMap = topojson.feature(data,data.objects.states).features
    //console.log(usMap);

    svg.selectAll(".country").data(usMap)
                             .enter()
                             .append("path")
                             .attr("class", "country") //to inherit light blue properties etc. -- see GeoUSA.html file
                             .attr("d",path)
                             .on("click",zoomToBB);
    // see also: http://bl.ocks.org/mbostock/4122298 -> used same pattern above

    loadStats();    
});


var createDetailVis = function(){
    
    //make step size for xScale
    step_size = bbVisDetail.w / 23 ; //24 hours so 23 intervals
    var xScalerange = [];
    for(i=0;i<time_keys.length;i++){
        xScalerange.push(i*step_size);
    }

    //add scales
    yScale = d3.scale.linear().domain([max,0]).range([0,bbVisDetail.h/2]);
    xScale = d3.scale.ordinal().domain(time_keys).range(xScalerange);
    //add axes    
    var yAxis = d3.svg.axis().scale(yScale).orient("right").ticks(5);
    var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(23); //24 hrs = 24 ticks
    
    //append y axis to svg
    detailVis.append("g")
             .call(yAxis)
             .attr("class","axis")
             .attr("transform", "translate("+ bbVisDetail.x + "," + bbVisDetail.y + ")");
    //append x axis to svg                     
    detailVis.append("g")
             .call(xAxis)
             .attr("class","axis")
             .attr("transform", "translate("+ (bbVisDetail.x-bbVisDetail.w) + "," + (bbVisDetail.y+bbVisDetail.h/2) + ")")
             .selectAll("text")
             .attr("x",-50)
             .attr("y",0)
             .style("font-size",10)
             .attr("transform", "rotate(280)");                 
}


var updateDetailVis = function(data,name){
  //console.log(data,name);
  
  d3.selectAll(".bars").remove(); //remove bars when you click on a new city.
  
  var hours = data.hourly;
  
  for(i=0;i<time_keys.length;i++){
    var k = hours[time_keys[i]];
    
    detailVis.append("rect")
             .attr("x",xScale(time_keys[i]))
             .attr("y",bbVisDetail.y+(yScale(k)))
             .attr("class","bars")
             .attr("width",step_size)
             .attr("height",bbVisDetail.h/2-yScale(k));    
  }
  
  d3.select("#detail_name").remove();
  
  detailVis.append("text")
           .attr("id","detail_name")
           .attr("x",bbVisDetail.x-bbVisDetail.w)
           .attr("y",bbVisDetail.y)
           .text(name);
  
}

var zoom_count = 0;
var zoom_in_or_out = 0;
var centered;
function zoomToBB(d) { //pass in the 'd' -- otherwise it's undefined
  //implementing http://bl.ocks.org/mbostock/2206590 like instructions outline
  //NOTE: I am directly copying the clicked() function. I just have to change a few things for it to work, like the original 'd'... 
  var x,y,k;
  
  zoom_count += 1 ;
  if(zoom_count % 2 == 0) {
    zoom_in_or_out = 0; }
  if(zoom_count % 2 != 0){
    zoom_in_or_out = 1; }
  
  if (d && centered !== d) {
    var centroid = path.centroid(d);
    x = centroid[0];
    y = centroid[1];
    k = 4;
    centered = d;
  } 
  else {
    x = width/2;
    y = height/2;
    k = 1;
    centered = null;
   }
   
  svg.selectAll("path").classed("active", centered && function(d) { return d === centered; });

  svg.transition().duration(750)
                  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
                  .style("stroke-width", 1.5 / k + "px");
}
