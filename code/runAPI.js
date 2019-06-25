function strToResStr(startTime){
  var flag = startTime.substr(0,2) > 12;
  var head = flag ? "오후 " : "오전 ";
  var timeFrag = startTime.split(':');
  var hour = flag ? parseInt(timeFrag[0]) - 12 : timeFrag[0];
  var min = timeFrag[1];

  return head + hour + "시 " + min + "분";
}

module.exports.function = function runAPI (selectedStation) {
  // System Require
  var http = require('http');
  var config = require('config');
  var console = require('console');
  
  // Utility 
  const getDayCode = require('./utils/getDayCode.js');
  const getUpDown = require('./utils/getUpDown.js');
 
  // Structure To Variable
  let toStation = selectedStation.toStation;
  let desStation = selectedStation.desStation;
  
  // Encoding Station Name
  var encodedTo = encodeURI( toStation );
  var encodedDes = encodeURI ( desStation );
 
   //----------------------상하행 및 소요시간, 환승역 수
  var getTimeURL = 'http://swopenapi.seoul.go.kr/api/subway/476b5764513132333132316f72546449/json/shortestRoute/0/5/'+encodedTo+'/'+encodedDes+'/';
  var response2 = http.getUrl(getTimeURL);
  var getTimeJSON = JSON.parse(response2);
  
  var needTime = getTimeJSON.shortestRouteList[0].minTravelTm; //소요시간
  console.log("소요시간" + needTime);
  
  var trasnferCnt = getTimeJSON.shortestRouteList[0].TransferCnt; //환승역수
  
  var st1 = getTimeJSON.shortestRouteList[0].minStatnId.split(',')[0];
  var st2 = getTimeJSON.shortestRouteList[0].minStatnId.split(',')[1];
  var roots = getUpDown(st1,st2); //상행 = 1 혹은 하행 = 2, 내선 = 1, 외선 =2
    
  //------------시작 호선 찾기
  var hosuns = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1063, 1065, 1067, 1069, 1071, 1075, 1077, 1078, 1079, 1080,1081,1061];
  var hosunNames = ['01호선', '02호선', '03호선', '04호선', '05호선', '06호선', '07호선', '08호선', '09호선', '경의선', '공항철도', '경춘선', '인천선', '수인선', '분당선', '신분당선', '인천2호선', '의정부경전철', '용인경전철','경강선','경의선'];
  
  //startHosun = 시작 호선
  var startHosun = getTimeJSON.shortestRouteList[0].minStatnId.split(',')[0].substr(0,4);
  for(var i=0; i< hosuns.length ; i++) {
    if(parseInt(startHosun)==hosuns[i]) {
      startHosun = hosunNames[i];
      break;
    }
  }
  console.log(startHosun);
  
  //-----------------환승역들 찾기
  var sts = getTimeJSON.shortestRouteList[0].shtStatnId.split(','); //신경쓰지 마셈
  
  var transferST = []
  var transferLine= []
  
  //환승역 찾는 알고리즘
  for(i = 0 ; i < parseInt(getTimeJSON.shortestRouteList[0].shtStatnCnt) ; i++) {
    if(parseInt(sts[i]) - parseInt(sts[i+1]) >= 2 | parseInt(sts[i]) - parseInt(sts[i+1]) <= -2) {
     for(var j=0; j< hosuns.length; j++) {
       if(parseInt(sts[i+1].substr(0,4))==hosuns[j]){
         console.log(getTimeJSON.shortestRouteList[0].shtStatnNm.split(',')[i+1]);
         transferST.push(getTimeJSON.shortestRouteList[0].shtStatnNm.split(',')[i+1]);
         transferLine.push(hosunNames[j]);
        }
       }
     }
    }
  
  transferInfo = []; //환승내역
 for(i=0;i<transferST.length;i++) {
   transferInfo.push({
     transferStation: transferST[i],
     transferLine: transferLine[i]
   });
 }
 console.log(transferInfo)
  
  // For Api Form
  encodedTo = toStation == '서울' ? encodedURI('서울역') : encodedTo;
  encodedDes = desStation == '서울' ? encodedURI('서울역') : encodedDes;
  
  //--------------------------역명 to 코드
  var codeUrl = "http://openAPI.seoul.go.kr:8088/476b5764513132333132316f72546449/json/SearchInfoBySubwayNameService/1/100/"+encodedTo+"/";
  var codeArr = [];
  var codeResponse = http.getUrl(codeUrl);
  var getCodeJSON = JSON.parse(codeResponse);
  var stCode = "";
  
  var row = getCodeJSON.SearchInfoBySubwayNameService.row.length;
  console.log(getCodeJSON);
  console.log("열차수는" + row);
  
  for (var i = 0;i < parseInt(row);i++){
    codeArr.push({
    STATION_CD: getCodeJSON.SearchInfoBySubwayNameService.row[i].STATION_CD,
    LINE_NUM: getCodeJSON.SearchInfoBySubwayNameService.row[i].LINE_NUM
    });
  }

  for(var i = 0;i<codeArr.length;i++){
    if(startHosun==codeArr[i].LINE_NUM){
      stCode = codeArr[i].STATION_CD;
      break;
    }
  }
  
  console.log(stCode);
  
  var dayCode = getDayCode();
  console.log(dayCode)
    
  var startTimeUrl = "http://openAPI.seoul.go.kr:8088/476b5764513132333132316f72546449/json/SearchArrivalTimeOfLine2SubwayByIDService/1/3/"+stCode+"/"+roots+"/"+dayCode+"/";
  
  var codeResponse = http.getUrl(startTimeUrl);
  var getCodeJSON = JSON.parse(codeResponse);
  var len = getCodeJSON.SearchArrivalTimeOfLine2SubwayByIDService.row.length
  console.log(getCodeJSON.SearchArrivalTimeOfLine2SubwayByIDService.row[0].ARRIVETIME);
  
  var startTime = [];
  for(var i = 0; i<len;i++){
    startTime[i] = getCodeJSON.SearchArrivalTimeOfLine2SubwayByIDService.row[i].ARRIVETIME;
  }
  
   for(var i=0; i<len ; i++) 
     startTime[i] = strToResStr(startTime[i]);
  
  console.log(toStation + "에서 " + desStation +"으로 가는 가장 빠른 열차는 " + startTime[0] + "입니다.");
  
  return {
    to : toStation,
    des : desStation,
    result : needTime,
    start : startTime,
    transfer : transferInfo
  }
}