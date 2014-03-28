/**
 * Modified by Conor Myhrvold on 3/27/14.
 */

 // NOTE: Some indicators don't have values. Test with Death Rate. Then select 2007,2008,2009,2010,2011 etc. individually.
 //       I am not sure why but you might have to select *up to* 2-3 before it starts displaying, but then it should display all
 //       in the above range, plus for w/e other indicator years have data. Almost always twice. Occasionally 3 times.
 
var margin = {
    top: 50,
    right: 50,
    bottom: 50,
    left: 50
};

var width = 960 - margin.left - margin.right;
var height = 700 - margin.bottom - margin.top;

var bbVis = {
    x: 100,
    y: 10,
    w: width - 100,
    h: 300
};

//make svg
var svg = d3.select("#vis").append("svg").attr("id","mySVG").attr({
    width: width + margin.left + margin.right,
    height: height + margin.top + margin.bottom
}).append("g").attr({
        transform: "translate(" + margin.left + "," + margin.top + ")"
    });
    
//options for picking different layouts
var projectionMethods = [
    {
        name:"mercator",
        method: d3.geo.mercator().translate([width/2, height/2])
    },{
        name:"equiRect",
        method: d3.geo.equirectangular().translate([width/2, height/2])
    },{
        name:"stereo",
        method: d3.geo.stereographic().translate([width/2, height/2])
    }
];

//declare global variables
var actualProjectionMethod = 0;
var colorMin = "blue";
var colorMax = "red";
var year_list = d3.range(1960,2012); //make year list for drop down button 
var path = d3.geo.path().projection(projectionMethods[0].method);
var countryinfo = {}; //make empty dictionary for country info
var queryinfo = {} ; //set up in same way that I did for countryinfo
var indicatorString;    
var indicator1;
var indicator2;
var max;
var min;

//getting indicator data
function runAQueryOn(indicatorString) {
    $.ajax({
        url: "http://api.worldbank.org/countries/all/indicators/"+indicatorString ,
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function (data, status){
        
            data = data[1]; // take data we want out of a list of lists
            
            for(i=0;i<data.length;i++){
               var idx = data[i].country.id; //make country.id idx the key
               queryinfo[idx] = data[i]; //make the rest of the data the value           
            }
            
            //get mins and maxes for the scales (domain, the input)
            max = 0;
            min = 10000;
            for(i=0;i<data.length;i++){
                if( parseFloat(data[i].value) > max){
                    max = parseFloat(data[i].value);
                }
                if( parseFloat(data[i].value) < max){
                    min = parseFloat(data[i].value);
                }
            }
            //console.log("max",max);
            //console.log("min",min);
            
            var color = d3.scale.linear().domain([min,max]).range([colorMin,colorMax]) ;
            
            var keys = Object.keys(countryinfo);
            for(i=0;i<keys.length;i++){ //take svg in 3 letter codes and converting into our 2 letter code values from the query
                var current_key = keys[i];         
                var country_id = countryinfo[current_key].iso2Code; //converts from a 3 letter, to a 2 letter code
                var country_data = queryinfo[country_id]; //get the data queried from that country
                
                //we don't want null values -- and we want them converted into floats
                if(country_data != null){
                    var country_value = parseFloat(country_data.value);
                    d3.select("#"+current_key).style("fill",color(country_value)); //fill country with color from color scale
                }
            }
        }
        
    });
}

//run a query to get country data
function runAQueryOn2() {
    $.ajax({
        url: "http://api.worldbank.org/countries?format=jsonP&prefix=Getdata&per_page=500",
        jsonpCallback:'getdata',
        dataType:'jsonp',
        success: function (data, status){
           data = data[1]; // take data we want out of a list of lists
           for(i=0;i<data.length;i++){
               var idx = data[i].id; //make country idx the key
               countryinfo[idx] = data[i]; //make the rest of the data the value
           }
           //console.log("country_info is", countryinfo)
        }
    });
}

var initVis = function(error, indicators, world){
    //console.log(indicators);
    //console.log(world);

    var map = world.features;
    
    svg.selectAll(".country").data(map)
                             .enter()
                             .append("path")
                             .attr("id", function(d,i){return d.id}) //assign each svg country the 3 letter id to color selectively
                             .attr("class","country")
                             .attr("d",path);

    //make year drop down radio button
    d3.select("#selectorYear").append("select")
                              .selectAll("option")
                              .data(year_list)
                              .enter().append("option")
                              .text(function(d) {return d});
                              
    //make indicator drop down radio button
    d3.select("#selector").append("select")
                              .selectAll("option")
                              .data(indicators)
                              .enter().append("option")
                              .text(function(d) {return d.IndicatorName});

    //selector for the type of indicator you want to display
    d3.select("#selector").select("select").on("change", function(){
            indicator1 = this.options[this.selectedIndex].__data__.IndicatorCode ; //use this.options[this.selectedIndex] syntax          
            
            indicatorString = indicator1 + "?format=jsonP&prefix=Getdata&per_page=500&date=" + indicator2 ; //dynamically add in API address + year. pick exact info I want from list.

            runAQueryOn2(); //get country data
            runAQueryOn(indicatorString); //you select from drop down and then it runs query to grab data   
        })
    
    //selector for the year of the given indicator
    d3.select("#selectorYear").select("select").on("change", function(){
            indicator2 = this.options[this.selectedIndex].__data__ ; //see:  http://stackoverflow.com/questions/3170648/how-to-get-javascript-select-boxs-selected-text for syntax
            
            //console.log("indicator1", indicator1); console.log("indicator2", indicator2); //log the indicator data that's returned
            
            indicatorString = indicator1 + "?format=jsonP&prefix=Getdata&per_page=500&date=" + indicator2 ; //dynamically add in API address + year. pick exact info I want from list.
            
            runAQueryOn2(); //get country data
            runAQueryOn(indicatorString); //grab data
        })    

    //make tooltip that puts country name + then the indicator value afterward
    d3.selectAll(".country").on("mouseover", function() { // test with: console.log(this.__data__);
    
                                       svg.append("text")       
                                          .attr("id", "tooltip")
                                          .attr("class","name")              
                                          .attr("x", d3.mouse(this)[0])
                                          .attr("y", d3.mouse(this)[1])                            
                                          .text(this.__data__.properties.name)
                                          .style("font-weight","bold")
                                          .style("font-size",12);

    country_id = countryinfo[this.__data__.id].iso2Code;
    var value = queryinfo[country_id].value;                                         
                                                                           
                                       svg.append("text")
                                          .attr("id", "tooltip2")
                                          .attr("class","name")              
                                          .attr("x", d3.mouse(this)[0])
                                          .attr("y", d3.mouse(this)[1]+10)                            
                                          .text("value:" + value)
                                          .style("font-weight","bold")
                                          .style("fill","white")
                                          .style("font-size",10);                                   
                                      })              
                            //remove tooltip                                                                               
                            .on("mouseout", function(d) { d3.select("#tooltip").remove();                                         
                                                          d3.select("#tooltip2").remove();});                                                            
}

//queue function to make multiple calls.. 
queue()
    .defer(d3.csv,"../data/worldBank_indicators.csv")
    .defer(d3.json,"../data/world_data.json")
    // .defer(d3.json,"../data/WorldBankCountries.json")
    .await(initVis);

//label that says the projection method that's being used
var textLabel = svg.append("text").text(projectionMethods[actualProjectionMethod].name).attr({
    "transform":"translate(-40,-30)"
})

//function to change the map projection
var changePro = function(){
    actualProjectionMethod = (actualProjectionMethod+1) % (projectionMethods.length);

    textLabel.text(projectionMethods[actualProjectionMethod].name);
    path= d3.geo.path().projection(projectionMethods[actualProjectionMethod].method);
    svg.selectAll(".country").transition().duration(750).attr("d",path);
};

//button to change the map projection
d3.select("body").append("button").text("changePro").on({
    "click":changePro
})

//add legend
var ticks = 10; //define number of ticks
var legendary_scale = d3.scale.linear().domain([0,ticks]).range([colorMin,colorMax]);

//text for legend title
var legend_text = svg.append("text").attr("x", 0)
                                    .attr("y", bbVis.h + 120)
                                    .text("Color Legend")
                                    .style("font-weight","bold");
//rectangle for no data
var no_value_rect = svg.append("rect").attr("x", 0)
                                      .attr("y", bbVis.h + 130)
                                      .attr("height", 10)
                                      .attr("width", 10)
                                      .style("fill", "white")
                                      .style("stroke", "black");
//text for no data                                    
var no_value = svg.append("text").attr("x", 15)
                                 .attr("y", bbVis.h + 140)
                                 .text("Unreported (No Data)")
                                 .style("font-weight","normal");

//text for low end of color scale
var low_value = svg.append("text").attr("x", 15)
                                  .attr("y", bbVis.h + 210)
                                  .text("Low")
                                  .style("font-weight","normal");

//text for high end of color scale                                
var high_value = svg.append("text").attr("x", 15)
                                   .attr("y", bbVis.h + 160)
                                   .text("High")
                                   .style("font-weight","normal");

// rectangle for other legend values -- can be one big bar as opposed to individual bars                                                                   
//manually make the color scale to display under the legend
for(i=0;i<20;i++){
    svg.append("rect").attr("x", 0)
                      .attr("y", bbVis.h + 150 + 3*i) //multiply i by same integer as is the height
                      .attr("height", 3)
                      .attr("width", 10)
                      .style("fill", legendary_scale(i) );
}