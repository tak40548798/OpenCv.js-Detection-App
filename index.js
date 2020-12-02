
import QrScanner from "./js/qr-scanner.min.js";
QrScanner.WORKER_PATH = './js/qr-scanner-worker.min.js';

window.addEventListener("load", function () {
  var videoWidth = 1920;
  var videoHeight = 1080;
  var processLock = true;
  var degree = 0;
  var allFramePointXY = [];
  var epsilon = 0.01;
  var workSheetClass = ['0', '0'];
  var fristDeviceId = [];

  var stopCanvas = document.getElementById("stopCanvas")
  var showCanvas = document.getElementById("showCanvas")
  var snapShot = document.getElementById("snapShot")
  var streamVideo = document.getElementById("streamVideo")
  var videoOutput = document.getElementById("videoOutput");
  var rotateBtn = document.getElementById("rotateBtn");
  var peri2numberEle = document.getElementById("peri2number")
  var filterFunction = document.getElementById("filterFunction")
  var workSheetNmae = 'A4';
  var success = 0;
  var fail = 0;
  var counter = 0;
  var fileSystem = null;
  const FPS = 24;
  var canvasLock = true;
  var paperClassVal = document.getElementById("paperClass")
  var compareImageLink = document.getElementById("compareImage")
  compareImageLink.href = "compareImage.html?paperId=" + paperClassVal.value;
  var test_check = document.getElementById("check")
  var rect_index = document.getElementsByClassName("rect_index")

  paperClassVal.addEventListener("change", function () {
    compareImageLink.href = "compareImage.html?paperId=" + 'A4';
  })

  class screen_attributes {
    constructor(work_sheet_nmae) {
      this.horizontal = false;
      this.vertical = false;
      this.big_boundingRect = {};
      this.big_rectangle = {};
      this.fix_judge = 0;
      this.screen_rectangle_number = null;

      this.sheet = {
        "sheet_name": work_sheet_nmae,
        "rect_width": 4,
        "rect_height": 2,
        "rect_total": 8
      };

      this.center = {
        'ctx': 0,
        'cty': 0
      };

      this.calc_sheet_judge = function () {

        switch (this.sheet.sheet_name) {
          case 'A4':
            this.sheet.rect_width = 2;
            this.sheet.rect_height = 2;
            this.sheet.rect_toal = 4;
            break;
          case 'B4':
            this.sheet.rect_width = 4;
            this.sheet.rect_height = 1;
            this.sheet.rect_toal = 4;
            break;
          case 'A8':
            this.sheet.rect_width = 4;
            this.sheet.rect_height = 2;
            this.sheet.rect_toal = 8;
            break;
          default:
            this.sheet.rect_width = 4;
            this.sheet.rect_height = 2;
            this.sheet.rect_toal = 8;
        }

        if (this.screen_rectangle_number != this.sheet.rect_toal
          && this.screen_rectangle_number < this.sheet.rect_toal)
          this.fix_judge = 1;
      };

      this.calc_screen_info = function (screen_point) {
        this.screen_rectangle_number = screen_point.length;
        for (let k = 0; k < screen_point.length; k++) {
          const element = screen_point[k].cntInfo;
          this.center.ctx += element.center.x;
          this.center.cty += element.center.y;
          if (typeof element !== "undefined") {

            if (this.sheet.sheet_name == "B4")
              this.horizontal = element.angle < 20 ? false : true;
            else
              this.horizontal = element.angle < 50 ? false : true;

          }
        }
        this.center.ctx /= screen_point.length;
        this.center.cty /= screen_point.length;
      };
    }
  }
  
  function scannerLoop() {
    let loopLock = true;

    let loop = function () {

      QrScanner.scanImage(streamVideo)
        .then(function (result) {

          console.log(result)

          compareImageLink.href = "compareImage.html?paperId=" + result;
          paperClassVal.value = result;
          workSheetNmae = result;

          loopLock = false;
          canvasStart()

        }).then(function () {

          clearTimeout(loop)
          return 0;

        })
        .catch(function (error) {

          console.log(error || 'No QR code found.')

          if (loopLock) {
            setTimeout(loop, 800)
          }

        });
    }

    loop();
  }

  peri2numberEle.oninput = function () {
    let val = this.value;

    window.setTimeout(function () {
      epsilon = val;
      document.getElementById("peri2number2").innerHTML = "epsilon:" + val;
      console.log(val)
    }, 50)
  }

  rotateBtn.onclick = function () {

    let rotateScale = videoHeight / videoWidth;

    degree += 90;

    if (degree == 360)
      degree = 0;

    switch (degree) {
      case 0:
        streamVideo.style.transform = "rotate(0deg)"
        break;
      case 90:
        streamVideo.style.transform = "rotate(90deg) scale(" + rotateScale + ")"
        break;
      case 180:
        streamVideo.style.transform = "rotate(180deg)"
        break;
      case 270:
        streamVideo.style.transform = "rotate(270deg) scale(" + rotateScale + ")"
        break;
      default:
        break;
    }

  }

  stopCanvas.onclick = function () {
    canvasStop();
  }

  showCanvas.onclick = function () {
    canvasStart();
  }

  function canvasStop() {
    streamVideo.style.display = "block";
    videoOutput.style.display = "none";
    canvasLock = false;
  }

  //計算缺失象限數據
  function calcCntInfo(finSortEndPoint, counter) {
    //最小外接矩形
    let xPointArr = [];
    let yPointArr = [];
    let Cx = 0, Cy = 0;
    for (let i = 0; i < finSortEndPoint.length; i++) {
      //有index個x和y (各有4個)
      Cx += finSortEndPoint[i]['x']
      Cy += finSortEndPoint[i]['y']
      xPointArr.push(finSortEndPoint[i]['x'])
      yPointArr.push(finSortEndPoint[i]['y'])
    }
    //最小外接矩形左上最小的x y座標
    let leftTopX = Math.min(...xPointArr)
    let leftTopY = Math.min(...yPointArr)
    //最小外接矩形右下最大的x y座標
    let rightBottomX = Math.max(...xPointArr)
    let rightBottomY = Math.max(...yPointArr)
    //最小外接矩形長寬
    let width = rightBottomX - leftTopX;
    let height = rightBottomY - leftTopY;
    //最小外接矩形質心
    Cx /= finSortEndPoint.length;
    Cy /= finSortEndPoint.length;

    //缺失矩形的點排序
    const center = {
      'x': Cx,
      'y': Cy
    }

    const angles = finSortEndPoint.map(({
      x,
      y
    }) => {
      return {
        x,
        y,
        angle: Math.atan2(y - center.y, x - center.x) * 180 / Math.PI
      };
    });

    angles.sort((a, b) => a.angle - b.angle)

    let p = {
      'cntPoint': angles,
      'cntInfo': {
        'counter': counter,
        'boundingRect': {
          'x': leftTopX,
          'y': leftTopY,
          'width': width,
          'height': height
        },
        'center': {
          'x': Cx,
          'y': Cy
        }

      }
    }

    return p;
  }

  function canvasStart() {
    streamVideo.style.display = "none";
    videoOutput.style.display = "block";
    canvasLock = true;
    var showCanvas = function () {

      let video = document.getElementById("streamVideo");
      let cap = new cv.VideoCapture(video);
      let src = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
      let dst = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC1);
      let drawDst = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);

      var processVideo = function () {

        let begin = Date.now();
        cap.read(src)
        src.copyTo(drawDst);
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);

        switch (degree) {
          case 0:
            videoOutput.style.height = "100%";
            videoOutput.style.width = "auto";
            break;
          case 90:
            videoOutput.style.height = 'calc(' + 100 + '%)';
            videoOutput.style.width = "auto";
            cv.flip(dst, dst, 0)
            cv.transpose(dst, dst)
            cv.flip(drawDst, drawDst, 0)
            cv.transpose(drawDst, drawDst)
            break;
          case 180:
            videoOutput.style.height = "100%";
            videoOutput.style.width = "auto";
            cv.flip(dst, dst, 1)
            cv.flip(dst, dst, 0)
            cv.flip(drawDst, drawDst, 1)
            cv.flip(drawDst, drawDst, 0)
            break;
          case 270:
            videoOutput.style.height = 'calc(' + 100 + '%)';
            videoOutput.style.width = "auto";
            cv.flip(dst, dst, 1)
            cv.transpose(dst, dst)
            cv.flip(drawDst, drawDst, 1)
            cv.transpose(drawDst, drawDst)
            break;
          default:
            videoOutput.style.height = "auto";
            videoOutput.style.width = "70%";
            break;
        }

        let detection_result_point = detectionRectangle(dst, drawDst);
        let rect_sort_end_point = AllSortRectangleV2(detection_result_point, drawDst, 1);
        let screen_rect_info = new screen_attributes(workSheetNmae)
        screen_rect_info.calc_screen_info(rect_sort_end_point);
        screen_rect_info.calc_sheet_judge();

        screen_rect_info.big_boundingRect = detection_result_point["bigBoundingRect"];
        screen_rect_info.big_rectangle = detection_result_point["bigRect"];

        /**
         * 測試
         * 模擬手遮擋矩形
         */
        if (test_check.checked) {

          let check_total_index = [];

          for (let index = 0; index < rect_index.length; index++) {
            const element = rect_index[index];
            if (element.checked)
              check_total_index.push(element.value)

          }

          let temp_end_point = [...rect_sort_end_point];
          for (let k = 0; k < check_total_index.length; k++) {
            delete temp_end_point[check_total_index[k]];
          }

          temp_end_point = temp_end_point.filter(function (el) {
            return el != null;
          });

          rect_sort_end_point = []
          rect_sort_end_point = [...temp_end_point];

          screen_rect_info = new screen_attributes(workSheetNmae)
          screen_rect_info.calc_screen_info(rect_sort_end_point);
          screen_rect_info.calc_sheet_judge();
          screen_rect_info.big_boundingRect = undefined
          screen_rect_info.big_rectangle = undefined
        }

        //利用最大的矩形進行補正
        let fix_rect_function_1 = function (o1, o2, o3, o4) {
          let maxTotal1 = screen_rect_info.sheet.rect_width;
          let maxTotal2 = screen_rect_info.sheet.rect_height;

          let lineOne = [], lineTwo = [], lineThree = [], endPoint = [];

          for (let j = 0; j <= maxTotal1; j++) {
            //4:0 -> 3:1 -> 2:2 -> 1:3 -> 0:4
            let lineRatio1 = maxTotal1 - j;
            let lineRatio2 = j;
            let x, y, p1, p2, p3;

            x = (lineRatio1 * o1.x + lineRatio2 * o2.x) / maxTotal1;
            y = (lineRatio1 * o1.y + lineRatio2 * o2.y) / maxTotal1;
            p1 = new cv.Point(x, y);
            lineOne.push({ 'x': p1.x, 'y': p1.y });
            cv.circle(drawDst, p1, 10, new cv.Scalar(255, 255, 255), 2, cv.LINE_AA, 0);

            x = (lineRatio1 * o3.x + lineRatio2 * o4.x) / maxTotal1;
            y = (lineRatio1 * o3.y + lineRatio2 * o4.y) / maxTotal1;
            p3 = new cv.Point(x, y);
            lineThree.push({ 'x': p3.x, 'y': p3.y });
            cv.circle(drawDst, p3, 10, new cv.Scalar(255, 255, 255), 2, cv.LINE_AA, 0)

            x = (p1.x + p3.x) / maxTotal2;
            y = (p1.y + p3.y) / maxTotal2;
            p2 = new cv.Point(x, y);
            lineTwo.push({ 'x': p2.x, 'y': p2.y })
            cv.circle(drawDst, p2, 10, new cv.Scalar(255, 255, 255), 2, cv.LINE_AA, 0)


          }

          if (workSheetNmae == 'A4' || workSheetNmae == 'A8') {
            for (let k = 0; k < lineTwo.length - 1; k++) {
              let cntPoint = []
              cntPoint.push(lineOne[k]);
              cntPoint.push(lineOne[k + 1]);
              cntPoint.push(lineTwo[k + 1]);
              cntPoint.push(lineTwo[k]);
              endPoint.push(cntPoint)
            }
            for (let k = 0; k < lineTwo.length - 1; k++) {
              let cntPoint = []
              cntPoint.push(lineTwo[k]);
              cntPoint.push(lineTwo[k + 1]);
              cntPoint.push(lineThree[k + 1]);
              cntPoint.push(lineThree[k]);

              endPoint.push(cntPoint)
            }

            return endPoint;
          } else if (workSheetNmae == 'B4') {
            for (let k = 0; k < lineOne.length - 1; k++) {
              let cntPoint = []
              cntPoint.push(lineOne[k]);
              cntPoint.push(lineOne[k + 1]);
              cntPoint.push(lineThree[k + 1]);
              cntPoint.push(lineThree[k]);
              endPoint.push(cntPoint)
            }

            return endPoint;
          }

        }

        //利用現有的矩形進行補正
        let fix_rect_function_2 = function (sort_end_point, screen_rect_info) {

          const temp_ctx = screen_rect_info.center.ctx;
          const temp_cty = screen_rect_info.center.cty;

          if (workSheetNmae == 'A4') {
            return A4_sheet(sort_end_point, temp_ctx, temp_cty)
          } else if (workSheetNmae == 'B4') {
            return B4_sheet(sort_end_point, temp_ctx, temp_cty, screen_rect_info)
          } else if (workSheetNmae == 'A8') {
            return A8_sheet_ver2(sort_end_point, temp_ctx, temp_cty)
            //return A8_sheet(sort_end_point, temp_ctx, temp_cty)
          }

        }

        let A8_sheet_ver2 = function (A8_sheet_point, resultX, resultY) {

          let rectangle_point = A8_sheet_point;
          let horizon = false;
          let tempWidth = videoWidth;
          let tempHeight = videoHeight;
          let circle_range = 7, circle_thickness = 7, circle_color = new cv.Scalar(255, 0, 0, 255);

          if (degree == 90 || degree == 270) {
            tempWidth = videoHeight;
            tempHeight = videoWidth;
          }

          for (let k = 0; k < rectangle_point.length; k++) {
            const element = rectangle_point[k].cntInfo.angle;
            horizon = element < 50 ? false : true;
          }

          let three_rectangle_no_stick_calc = function (rectangle_1, rectangle_2) {

            let x = 0, y = 0, cntPoint = [];

            x = rectangle_1.square.cntPoint[rectangle_1.idx_1].x
            y = rectangle_1.square.cntPoint[rectangle_1.idx_1].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            x = rectangle_1.square.cntPoint[rectangle_1.idx_2].x
            y = rectangle_1.square.cntPoint[rectangle_1.idx_2].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            x = rectangle_2.square.cntPoint[rectangle_2.idx_1].x
            y = rectangle_2.square.cntPoint[rectangle_2.idx_1].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            x = rectangle_2.square.cntPoint[rectangle_2.idx_2].x
            y = rectangle_2.square.cntPoint[rectangle_2.idx_2].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

            return calcCntInfo(cntPoint)
          }

          let two_rectangle_big_calc = function (rectangle_1, rectangle_2) {

            let x = 0, y = 0, cntPoint = [], cntArr = [];

            x = rectangle_1.square.cntPoint[rectangle_1.idx_1].x
            y = rectangle_1.square.cntPoint[rectangle_1.idx_1].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

            x = rectangle_1.square.cntPoint[rectangle_1.idx_2].x
            y = rectangle_1.square.cntPoint[rectangle_1.idx_2].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

            x = (rectangle_1.square.cntPoint[rectangle_1.idx_1].x + rectangle_2.square.cntPoint[rectangle_2.idx_1].x) / 2
            y = (rectangle_1.square.cntPoint[rectangle_1.idx_1].y + rectangle_2.square.cntPoint[rectangle_2.idx_1].y) / 2
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            cntPoint.push({ 'x': x, 'y': y })

            x = (rectangle_1.square.cntPoint[rectangle_1.idx_2].x + rectangle_2.square.cntPoint[rectangle_2.idx_2].x) / 2
            y = (rectangle_1.square.cntPoint[rectangle_1.idx_2].y + rectangle_2.square.cntPoint[rectangle_2.idx_2].y) / 2
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            cntPoint.push({ 'x': x, 'y': y })

            cntArr.push(calcCntInfo(cntPoint));
            cntPoint = [];

            x = (rectangle_1.square.cntPoint[rectangle_1.idx_1].x + rectangle_2.square.cntPoint[rectangle_2.idx_1].x) / 2
            y = (rectangle_1.square.cntPoint[rectangle_1.idx_1].y + rectangle_2.square.cntPoint[rectangle_2.idx_1].y) / 2
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            cntPoint.push({ 'x': x, 'y': y })

            x = (rectangle_1.square.cntPoint[rectangle_1.idx_2].x + rectangle_2.square.cntPoint[rectangle_2.idx_2].x) / 2
            y = (rectangle_1.square.cntPoint[rectangle_1.idx_2].y + rectangle_2.square.cntPoint[rectangle_2.idx_2].y) / 2
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
            cntPoint.push({ 'x': x, 'y': y })

            x = rectangle_2.square.cntPoint[rectangle_2.idx_1].x
            y = rectangle_2.square.cntPoint[rectangle_2.idx_1].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

            x = rectangle_2.square.cntPoint[rectangle_2.idx_2].x
            y = rectangle_2.square.cntPoint[rectangle_2.idx_2].y
            cntPoint.push({ 'x': x, 'y': y })
            cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

            cntArr.push(calcCntInfo(cntPoint));
            cntPoint = [];

            return cntArr
          }

          /**
            * 
            * @param {Array} rectangle_point 
            * @param {Number} result_x 
            * @param {Number} result_y 
            * @return {Array}
            */
          let test = function (rectangle_point, result_x, result_y) {

            let rectangle_result = [];

            /**
             * @return {String} Array[0] - filter class
             * @return {Array} Array[1] - top rectangle
             * @return {Array} Array[2] - bottom rectangle
             */
            let split_judge_rectangle = function (rectangle_point) {


              let split_Top = [], split_Bottom = [], split_Mid = [], filter_calss = '';

              if (rectangle_point.length == 0) {
                filter_calss = 'f0'
              } else {

                let lineM = (rectangle_point[0]['cntPoint'][1].y - rectangle_point[0]['cntPoint'][0].y) /
                  (rectangle_point[0]['cntPoint'][1].x - rectangle_point[0]['cntPoint'][0].x)

                if (!lineM) {
                  lineM = ((rectangle_point[0]['cntPoint'][1].y + 1) - (rectangle_point[0]['cntPoint'][0].y - 1)) /
                    (rectangle_point[0]['cntPoint'][1].x - rectangle_point[0]['cntPoint'][0].x)
                }

                console.log(lineM)

                let y2 = result_y - (lineM * result_x);


                let start_point_y = 0;
                let start_point_x = (lineM * result_x - result_y + start_point_y) / lineM;

                let end_point_y = tempWidth;
                let end_point_x = (lineM * result_x - result_y + end_point_y) / lineM;

                let start_point = new cv.Point(start_point_x, start_point_y)
                let end_point = new cv.Point(end_point_x, end_point_y)

                cv.line(drawDst, start_point, end_point, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)

                rectangle_point.forEach(function (ele) {

                  let val = ele.cntInfo.center.x * lineM - ele.cntInfo.center.y + y2;

                  if (val > 20)
                    split_Top.push(ele)
                  else if (val < -20)
                    split_Bottom.push(ele)
                  else
                    split_Mid.push(ele)

                })

                let filter_dict = [
                  ['f0', 'f0', 'f1', 'f1', 'f2'],
                  ['f0', 'f0', 'f1', 'f1', 'f2'],
                  ['f1', 'f1', 'f3', 'f3', 'f2'],
                  ['f1', 'f1', 'f3', 'f3', 'f2'],
                  ['f2', 'f2', 'f2', 'f2', 'f0']
                ]

                if (split_Mid.length) {

                  if (result_y > tempHeight / 2) {
                    split_Bottom = split_Mid;
                    split_Top = [];
                    split_Mid = [];
                  } else {
                    split_Top = split_Mid;
                    split_Bottom = [];
                    split_Mid = [];
                  }

                }

                let top_val = split_Top.length;
                let bottom_val = split_Bottom.length;


                filter_calss = filter_dict[top_val][bottom_val]

              }


              console.log([filter_calss, split_Top, split_Bottom])
              return [filter_calss, split_Top, split_Bottom];
            }

            /**
            * 延伸修正矩形 rectangle_calc()
            * @param {Array} standard - 一邊四個完整的矩形
            * @param {Array} side - 另一邊不完整的矩形
            * @param {Array} fixdata - 修正需要使用到矩形頂點index號碼
            * @return {Array} - 回傳補正後的矩形
            */
            let rectangle_calc = (standard, side, fixdata) => {

              let x, y, cntPoint = [];

              if (!(typeof standard == "undefined") && !(typeof side == "undefined")) {


                /**
                 * 其中一邊為4個矩形
                 * 另一邊有1個以上的矩形
                 * 或
                 * 另一邊為0個矩形
                 */
                if (side.length) {

                  let two_check = false, three_check = false;

                  function judge_two() {
                    let splitX = 0, splitY = 0, p1 = 0, p2 = 1;
                    let spacing_big = false, spacing_small = false, spacing_mid = false;
                    let calc_idx = {
                      'top': {
                        'left': {
                          'idx1': 0,
                          'idx2': 0,
                          'index1': [1, 0],
                          'index2': [3, 0]
                        },
                        'right': {
                          'idx1': 1,
                          'idx2': 0,
                          'index1': [1, 0],
                          'index2': [2, 1]
                        }
                      },
                      'bottom': {
                        'left': {
                          'idx1': 0,
                          'idx2': 0,
                          'index1': [2, 3],
                          'index2': [0, 3]
                        },
                        'right': {
                          'idx1': 1,
                          'idx2': 0,
                          'index1': [3, 2],
                          'index2': [1, 2]
                        }
                      }

                    }

                    for (let i = 0; i < side.length; i++) {
                      splitX += side[i]['cntInfo'].center.x;
                      splitY += side[i]['cntInfo'].center.y;
                    }
                    splitX /= side.length;
                    splitY /= side.length;

                    side.forEach(function (ele) {
                      let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                      let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                      let val = distance / length

                      if (val > 1.3 && val < 1.7) {
                        spacing_big = true; spacing_mid = false; spacing_small = false;
                        console.log('spacing_big')
                      }
                      if (val > 0.85 && val < 1.3) {
                        spacing_mid = true; spacing_big = false; spacing_small = false;
                        //console.log('spacing_mid')
                      }
                      if (val > 0.4 && val < 0.65) {
                        spacing_small = true; spacing_mid = false; spacing_big = false;
                        //console.log('spacing_small')
                      }
                    })


                    return spacing_big
                  }

                  function judge_three() {

                    let temp_x = 0, temp_y = 0, judge = false;

                    side.forEach(function (ele) {
                      temp_x += ele.cntInfo.center.x;
                    })

                    let val = (temp_x / 3 / side[1].cntInfo.center.x).toFixed(3)

                    if (val > 0.95 && val < 1.05)
                      judge = false
                    else
                      judge = true

                    return judge

                  }

                  /**
                   * 如果可以直接補正不做延伸的判斷
                   */
                  if (side.length == 2)
                    two_check = judge_two()

                  if (side.length == 3)
                    three_check = judge_three()

                  if (two_check)
                    side = A8_sheet_makeup(side, 0, 0)

                  if (three_check)
                    side = A8_sheet_makeup(side, 0, 0)


                  if (!two_check && !three_check) {

                    let total_index = [0, 1, 2, 3]
                    /**
                      * 判斷兩邊缺失的矩形
                      */
                    for (let k = 0; k < side.length; k++) {

                      for (let j = 0; j < standard.length; j++) {

                        let valx = (side[k].cntPoint[fixdata[0]].x / standard[j].cntPoint[fixdata[1]].x).toFixed(3)
                        //let valy = (side[j].cntPoint[fixdata[0]].y / standard[k].cntPoint[fixdata[1]].y).toFixed(3)

                        if (valx > 0.92 && valx < 1.08)
                          total_index.splice(total_index.indexOf(j), 1);

                      }
                    }

                    /**
                      * 補正缺失矩形
                      */
                    for (let j = 0; j < total_index.length; j++) {

                      let value = total_index[j]

                      x = standard[value].cntPoint[fixdata[1]].x;
                      y = standard[value].cntPoint[fixdata[1]].y;
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = standard[value].cntPoint[fixdata[3]].x;
                      y = standard[value].cntPoint[fixdata[3]].y;
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = (2 * standard[value].cntPoint[fixdata[1]].x - 1 * standard[value].cntPoint[fixdata[0]].x) / (2 - 1)
                      y = (2 * standard[value].cntPoint[fixdata[1]].y - 1 * standard[value].cntPoint[fixdata[0]].y) / (2 - 1)
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = (2 * standard[value].cntPoint[fixdata[3]].x - 1 * standard[value].cntPoint[fixdata[2]].x) / (2 - 1)
                      y = (2 * standard[value].cntPoint[fixdata[3]].y - 1 * standard[value].cntPoint[fixdata[2]].y) / (2 - 1)
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })

                      side.push(calcCntInfo(cntPoint));
                      cntPoint = [];

                    }


                  }

                } else {

                  /**
                    * 另一邊為0個矩形
                    * 補正缺失矩形
                    */

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata[1]].x;
                    y = standard[k].cntPoint[fixdata[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata[3]].x;
                    y = standard[k].cntPoint[fixdata[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    side.push(calcCntInfo(cntPoint));
                    cntPoint = [];

                  }
                }



              }

              const total = standard.concat(side);

              return total;
            };

            /**
             * 4:0 4:1 4:2 4:3
             * @param {Array} top - 分割後上方的矩形
             * @param {Array} bottom - 分割下上方的矩形
             * @return {Array} - 回傳補正後的矩形
             */
            let f2_extends_rectangle = function (top, bottom) {

              let data = {
                'fixBottom': [0, 3, 1, 2],
                'fixTop': [3, 0, 2, 1]
              }
              const result = (top.length > bottom.length) ? rectangle_calc(top, bottom, data.fixBottom) : rectangle_calc(bottom, top, data.fixTop);

              return result

            }

            /**
             * @param {Array} top - 分割後上方的矩形
             * @param {Array} bottom - 分割下上方的矩形
             * @return {Array} - 回傳補正後的矩形
             */
            let f1_extends_rectangle = function (top, bottom) {

              let fix_rect_angle = []

              let data = {
                'fixBottom': [0, 3, 1, 2],
                'fixTop': [3, 0, 2, 1]
              }

              /**
               * 其中一邊矩形為0個 另一邊矩形有3個或2個
               * 或是
              * 其中一邊矩形為1個 另一邊矩形有3個或2個
               */
              if (!(top.length) || !(bottom.length)) {

                let calc = function (standard, side, fixdata) {

                  let splitX = 0, splitY = 0;

                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;


                  if (!side.length) {
                    standard = A8_sheet_makeup(standard, splitX, splitY);
                    side = [];
                  }

                  let x, y, cntPoint = [];

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata[1]].x;
                    y = standard[k].cntPoint[fixdata[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata[3]].x;
                    y = standard[k].cntPoint[fixdata[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    side.push(calcCntInfo(cntPoint));
                    cntPoint = [];

                  }

                  return rectangle_calc(standard, side, fixdata)
                }

                fix_rect_angle = (top.length > bottom.length) ? calc(top, bottom, data.fixBottom) : calc(bottom, top, data.fixTop)

              } else {
                //其中一邊矩形為1個 另一邊矩形有2個
                let one_and_two = function (standard, side, fixdata, diect) {

                  let splitX = 0, splitY = 0, p1 = 0, p2 = 1;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  let calc_idx = {
                    'top': {
                      'left': {
                        'idx1': 0,
                        'idx2': 0,
                        'index1': [1, 0],
                        'index2': [3, 0]
                      },
                      'right': {
                        'idx1': 1,
                        'idx2': 0,
                        'index1': [1, 0],
                        'index2': [2, 1]
                      }
                    },
                    'bottom': {
                      'left': {
                        'idx1': 0,
                        'idx2': 0,
                        'index1': [2, 3],
                        'index2': [0, 3]
                      },
                      'right': {
                        'idx1': 1,
                        'idx2': 0,
                        'index1': [3, 2],
                        'index2': [1, 2]
                      }
                    }

                  }

                  function judge() {

                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;
                    standard.forEach(function (ele) {
                      let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                      let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                      let val = distance / length

                      if (val > 1.3 && val < 1.7) {
                        spacing_big = true; spacing_mid = false; spacing_small = false;
                        console.log('spacing_big')
                      }
                      if (val > 0.85 && val < 1.3) {
                        spacing_mid = true; spacing_big = false; spacing_small = false;
                        console.log('spacing_mid')
                      }
                      if (val > 0.4 && val < 0.65) {
                        spacing_small = true; spacing_mid = false; spacing_big = false;
                        console.log('spacing_small')
                      }
                    })

                  }

                  function big_calc(pointArr, idx1, idx2, idx3, idx4) {

                    let new_array = [...pointArr]

                    let square_1 = {
                      square: pointArr[0],
                      idx_1: 1,
                      idx_2: 2
                    }

                    let square_2 = {
                      square: pointArr[1],
                      idx_1: 0,
                      idx_2: 3
                    }

                    let result = two_rectangle_big_calc(square_1, square_2)

                    new_array.push(result[0])
                    new_array.push(result[1])

                    return new_array;
                  }

                  function mid_2_calc(standard, side, idx1, idx2, idx3, idx4, index) {

                    let p1, p2, p3, p4, a1, b1, c1, a2, b2, c2, det;
                    let Intersection = function () {
                      a1 = p2.y - p1.y;
                      b1 = p1.x - p2.x;
                      c1 = p1.x * p2.y - p2.x * p1.y;
                      a2 = p4.y - p3.y;
                      b2 = p3.x - p4.x;
                      c2 = p3.x * p4.y - p4.x * p3.y;
                      det = a1 * b2 - a2 * b1;
                    }

                    let new_array = [...standard]
                    let x = 0, y = 0, cntPoint = [];

                    p1 = { 'x': standard[index.idx1].cntPoint[index.index1[0]].x, 'y': standard[index.idx1].cntPoint[index.index1[0]].y }
                    p2 = { 'x': standard[index.idx1].cntPoint[index.index1[1]].x, 'y': standard[index.idx1].cntPoint[index.index1[1]].y }
                    p3 = { 'x': side[index.idx2].cntPoint[index.index2[0]].x, 'y': side[index.idx2].cntPoint[index.index2[0]].y }
                    p4 = { 'x': side[index.idx2].cntPoint[index.index2[1]].x, 'y': side[index.idx2].cntPoint[index.index2[1]].y }
                    Intersection();

                    x = (c1 * b2 - c2 * b1) / det
                    y = (a1 * c2 - a2 * c1) / det
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (standard[index.idx1].cntPoint[index.index2[0]].x)
                    y = (standard[index.idx1].cntPoint[index.index2[0]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (standard[index.idx1].cntPoint[index.index2[1]].x)
                    y = (standard[index.idx1].cntPoint[index.index2[1]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (side[index.idx2].cntPoint[index.index2[1]].x)
                    y = (side[index.idx2].cntPoint[index.index2[1]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    new_array.push(calcCntInfo(cntPoint))

                    cntPoint = [];
                    x = (standard[0].cntPoint[idx2].x)
                    y = (standard[0].cntPoint[idx2].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[0].cntPoint[idx3].x)
                    y = (standard[0].cntPoint[idx3].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[1].cntPoint[idx1].x)
                    y = (standard[1].cntPoint[idx1].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[1].cntPoint[idx4].x)
                    y = (standard[1].cntPoint[idx4].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                    return new_array;
                  }

                  function smail_calc(standard, side, index, standIdx) {
                    let new_array = [...standard]
                    let x = 0, y = 0, cntPoint = [];

                    x = (2 * side[0].cntPoint[index[1]].x - 1 * side[0].cntPoint[index[0]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[1]].y - 1 * side[0].cntPoint[index[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[0].cntPoint[index[3]].x - 1 * side[0].cntPoint[index[2]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[3]].y - 1 * side[0].cntPoint[index[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[1]].x
                    y = side[0].cntPoint[index[1]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[3]].x
                    y = side[0].cntPoint[index[3]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];



                    x = (2 * side[0].cntPoint[index[3]].x - 1 * side[0].cntPoint[index[2]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[3]].y - 1 * side[0].cntPoint[index[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[3]].x
                    y = side[0].cntPoint[index[3]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[standIdx].cntPoint[index[0]].x
                    y = standard[standIdx].cntPoint[index[0]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[standIdx].cntPoint[index[1]].x
                    y = standard[standIdx].cntPoint[index[1]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                    return new_array
                  }

                  judge();

                  if (spacing_big) {
                    standard = big_calc(standard, 0, 1, 2, 3);
                    fix_rect_angle = rectangle_calc(standard, side, fixdata)
                  }

                  if (spacing_mid) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;

                    if (diect == 'top') {

                      let val_1 = standard[0].cntPoint[3].x / side[0].cntPoint[1].x;
                      let val_2 = standard[1].cntPoint[2].x / side[0].cntPoint[0].x;

                      if ((val_1 > 0.9 && val_1 < 1.05))
                        standard = mid_2_calc(standard, side, 0, 1, 2, 3, calc_idx.top.left)

                      if ((val_2 > 0.9 && val_2 < 1.05))
                        standard = mid_2_calc(standard, side, 0, 1, 2, 3, calc_idx.top.right)

                      if (!((val_1 > 0.9 && val_1 < 1.05) || (val_2 > 0.9 && val_2 < 1.05)))
                        standard = A8_sheet_makeup(standard, splitX, splitY);

                    }

                    if (diect == 'bottom') {

                      let val_1 = standard[0].cntPoint[0].x / side[0].cntPoint[2].x;
                      let val_2 = standard[1].cntPoint[1].x / side[0].cntPoint[3].x;
                      if ((val_1 > 0.9 && val_1 < 1.05))
                        standard = mid_2_calc(standard, side, 0, 1, 2, 3, calc_idx.bottom.left)

                      if ((val_2 > 0.9 && val_2 < 1.05))
                        standard = mid_2_calc(standard, side, 0, 1, 2, 3, calc_idx.bottom.right)

                      if (!((val_1 > 0.9 && val_1 < 1.05) || (val_2 > 0.9 && val_2 < 1.05)))
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                    }

                    fix_rect_angle = rectangle_calc(standard, side, fixdata)
                  }

                  if (spacing_small) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;

                    if (diect == 'top') {

                      let val_1 = (standard[0].cntPoint[3].x - side[0].cntPoint[1].x) / 200;
                      let val_2 = (standard[1].cntPoint[2].x - side[0].cntPoint[0].x) / 200;

                      if (val_1 < 1.25 && val_1 > 0.90) {
                        standard = smail_calc(standard, side, [3, 0, 2, 1], 0)
                        console.log('left')
                      }

                      if (val_2 < -0.8 && val_2 > -1.2) {
                        standard = smail_calc(standard, side, [2, 1, 3, 0], 1)
                        console.log('right')
                      }

                      if (!(val_1 < 1.25 && val_1 > 0.90) && !((val_2 < -0.8 && val_2 > -1.2))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                        console.log('und')
                      }


                    }

                    if (diect == 'bottom') {

                      let val_1 = (standard[0].cntPoint[0].x - side[0].cntPoint[2].x) / 200;
                      let val_2 = (standard[1].cntPoint[1].x - side[0].cntPoint[3].x) / 200;

                      if (val_1 < 1.25 && val_1 > 0.90) {
                        standard = smail_calc(standard, side, [0, 3, 1, 2], 0)
                        console.log('left')
                      }

                      if (val_2 < -0.8 && val_2 > -1.2) {
                        standard = smail_calc(standard, side, [1, 2, 0, 3], 1)
                        console.log('right')
                      }

                      if (!(val_1 < 1.25 && val_1 > 0.90) && !((val_2 < -0.8 && val_2 > -1.2))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                        console.log('und')
                      }



                    }

                    fix_rect_angle = rectangle_calc(standard, side, fixdata)


                  }

                }

                let one_and_three = function (standard, side, fixdata, diect) {

                  function judge() {

                    let temp_x = 0, temp_y = 0, judge = 0;

                    standard.forEach(function (ele) {
                      temp_x += ele.cntInfo.center.x;
                    })

                    let val = (temp_x / 3 / standard[1].cntInfo.center.x).toFixed(3)

                    if (val > 0.995 && val < 1.005)
                      judge = 1
                    else
                      judge = 0

                    return judge

                  }

                  function rect_is_stick(standard, side, fixdata, diect) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;


                    if (diect == 'top') {

                      let val_1 = standard[0].cntPoint[3].x / side[0].cntPoint[1].x;
                      let val_2 = standard[2].cntPoint[2].x / side[0].cntPoint[0].x;

                      console.log(val_1, val_2)

                      if (val_1 < 1.1 && val_1 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'left')
                        console.log('left')
                      }

                      if (val_2 < 1.1 && val_2 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'right')
                        console.log('right')
                      }

                      if (!((val_1 < 1.1 && val_1 > 0.9)) && !((val_2 < 1.1 && val_2 > 0.9))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY)
                        console.log('und')
                      }

                      fix_rect_angle = rectangle_calc(standard, side, fixdata)

                    }


                    if (diect == 'bottom') {

                      let val_1 = standard[0].cntPoint[0].x / side[0].cntPoint[2].x;
                      let val_2 = standard[2].cntPoint[1].x / side[0].cntPoint[3].x;

                      if (val_1 < 1.1 && val_1 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'left')
                        console.log('left')
                      }

                      if (val_2 < 1.1 && val_2 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'right')
                        console.log('right')
                      }

                      if (!((val_1 < 1.1 && val_1 > 0.9)) && !((val_2 < 1.1 && val_2 > 0.9))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY)
                        console.log('und')
                      }

                      fix_rect_angle = rectangle_calc(standard, side, fixdata)

                    }



                  }

                  function three_rectangle_no_stick(standard, side, fixdata, diect) {


                    function no_stick_makeup(standard) {

                      let newPointArr = [...standard];
                      let total_distance = [];
                      let index1, index2;
                      let x = 0, y = 0, cntPoint = [];

                      for (let index = 0; index < standard.length - 1; index++) {
                        let index1 = index;
                        let index2 = index + 1;
                        let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                          + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                        total_distance.push(distance)
                      }

                      if (total_distance[0] < total_distance[1]) {
                        index1 = 1;
                        index2 = 2;
                      } else {
                        index1 = 0;
                        index2 = 1;
                      }

                      let square_1 = {
                        square: standard[index1],
                        idx_1: 1,
                        idx_2: 2
                      }

                      let square_2 = {
                        square: standard[index2],
                        idx_1: 0,
                        idx_2: 3
                      }

                      newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                      newPointArr.sort(function (a, b) {
                        return a.cntInfo.center.x - b.cntInfo.center.x;
                      });

                      return newPointArr
                    }

                    fix_rect_angle = no_stick_makeup(standard);

                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, fixdata)
                  }

                  const stick = judge()

                  stick ? rect_is_stick(standard, side, fixdata, diect) : three_rectangle_no_stick(standard, side, fixdata, diect)

                }

                let dict = [
                  [null, null, null, null],
                  [null, null, '12', '13'],
                  [null, '21', null, null],
                  [null, '31', null, null]
                ]

                let judge_filter = dict[top.length][bottom.length];

                if (judge_filter == '12' || judge_filter == '21') {
                  (top.length > bottom.length) ? one_and_two(top, bottom, data.fixBottom, 'top') : one_and_two(bottom, top, data.fixTop, 'bottom')
                }


                if (judge_filter == '13' || judge_filter == '31') {
                  (top.length > bottom.length) ? one_and_three(top, bottom, data.fixBottom, 'top') : one_and_three(bottom, top, data.fixTop, 'bottom')

                }


              }

              return fix_rect_angle
            }

            let f3_extends_rectangle = function (top, bottom) {

              let data = {
                'fixBottom': [0, 3, 1, 2],
                'fixTop': [3, 0, 2, 1]
              }

              let fix_rect_angle = [];

              let dict = [
                [null, null, null, null, null],
                [null, null, null, null, null],
                [null, null, '22', '23', null],
                [null, null, '32', '33', null],
                [null, null, null, null, null]
              ]

              let two_and_two = function (top, bottom) {

                function judge(standard) {

                  let splitX = 0, splitY = 0, p1 = 0, p2 = 1;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;

                  standard.forEach(function (ele) {

                    let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                    let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                    let val = distance / length

                    if (val > 1.3 && val < 1.7) {
                      spacing_big = true; spacing_mid = false; spacing_small = false;
                      console.log('spacing_big')
                    }
                    if (val > 0.85 && val < 1.3) {
                      spacing_mid = true; spacing_big = false; spacing_small = false;
                      console.log('spacing_mid')
                    }

                    if (val > 0.4 && val < 0.65) {
                      spacing_small = true; spacing_mid = false; spacing_big = false;
                      console.log('spacing_small')
                    }

                  })


                  return [spacing_big, spacing_mid, spacing_small]
                }

                function big_calc(pointArr, idx1, idx2, idx3, idx4) {

                  let new_array = [...pointArr]

                  let square_1 = {
                    square: pointArr[0],
                    idx_1: 1,
                    idx_2: 2
                  }

                  let square_2 = {
                    square: pointArr[1],
                    idx_1: 0,
                    idx_2: 3
                  }

                  let result = two_rectangle_big_calc(square_1, square_2)

                  new_array.push(result[0])
                  new_array.push(result[1])

                  return new_array;
                }

                function mid_and_small_calc(standard, side, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  let top_temp = [...standard];
                  let bottom_temp = [...side];


                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                function stick_makeup(standard, side, top, bottom, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  let top_temp = [...top];
                  let bottom_temp = [...bottom];
                  // standard = [standard[1], standard[2]];
                  // side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];
                  }

                  top_temp = A8_sheet_makeup(top_temp, 0, 0)
                  bottom_temp = A8_sheet_makeup(bottom_temp, 0, 0)

                  return top_temp.concat(bottom_temp)
                }

                let result_top = judge(top);
                let result_bottom = judge(bottom);

                if (result_top[0] || result_bottom[0]) {

                  if (result_top[0] && result_bottom[0]) {
                    top = big_calc(top, 0, 1, 2, 3);
                    bottom = big_calc(bottom, 0, 1, 2, 3);
                    fix_rect_angle = top.concat(bottom)
                  } else if (result_top[0]) {
                    let standard = big_calc(top, 0, 1, 2, 3);
                    let side = bottom;
                    fix_rect_angle = rectangle_calc(standard, side, data.fixBottom)
                  } else if (result_bottom[0]) {
                    let standard = big_calc(bottom, 0, 1, 2, 3);
                    let side = top;
                    fix_rect_angle = rectangle_calc(standard, side, data.fixTop)
                  }

                }

                if (result_top[1] && result_bottom[1]) {

                  let val_1 = top[0].cntPoint[3].x / bottom[0].cntPoint[0].x
                  let val_2 = top[1].cntPoint[3].x / bottom[1].cntPoint[0].x
                  console.log(val_1, val_2)
                  if (!((val_1 < 1.1 && val_1 > 0.95) && (val_2 < 1.1 && val_2 > 0.95))) {
                    fix_rect_angle = mid_and_small_calc(top, bottom, data.fixBottom, data.fixTop)
                    console.log('mid and mid')
                  }

                }

                if (result_top[2] && result_bottom[2]) {

                  let val_1 = top[0].cntPoint[3].x / bottom[1].cntPoint[1].x;
                  let val_2 = top[1].cntPoint[2].x / bottom[0].cntPoint[0].x;

                  if (val_1 < 1.1 && val_1 > 0.9 || val_2 < 1.1 && val_2 > 0.9)
                    fix_rect_angle = mid_and_small_calc(top, bottom, data.fixBottom, data.fixTop)

                  console.log('small')
                }

                if (result_top[2] && result_bottom[1]) {

                  let val_1 = top[0].cntPoint[3].x / bottom[1].cntPoint[0].x
                  let val_2 = top[1].cntPoint[3].x / bottom[0].cntPoint[0].x

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup([top[1]], [bottom[0]], top, bottom, data.fixBottom, data.fixTop)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup([top[0]], [bottom[1]], top, bottom, data.fixBottom, data.fixTop)
                  }

                }

                if (result_top[1] && result_bottom[2]) {

                  let val_1 = top[1].cntPoint[3].x / bottom[0].cntPoint[0].x
                  let val_2 = top[0].cntPoint[3].x / bottom[1].cntPoint[0].x

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup([top[0]], [bottom[1]], top, bottom, data.fixBottom, data.fixTop)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup([top[1]], [bottom[0]], top, bottom, data.fixBottom, data.fixTop)
                  }

                }

              }

              let three_and_three = function (top, bottom) {

                function judge(standard) {

                  let temp_x = 0, temp_y = 0, judge = 0;

                  standard.forEach(function (ele) {
                    temp_x += ele.cntInfo.center.x;
                  })

                  let val = (temp_x / 3 / standard[1].cntInfo.center.x).toFixed(3)

                  if (val > 0.995 && val < 1.005)
                    judge = 0
                  else
                    judge = 1

                  return judge

                }

                function no_stick_makeup(standard) {

                  let newPointArr = [...standard];
                  let total_distance = [];
                  let index1, index2;
                  let x = 0, y = 0, cntPoint = [];

                  for (let index = 0; index < standard.length - 1; index++) {
                    let index1 = index;
                    let index2 = index + 1;
                    let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                      + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                    total_distance.push(distance)
                  }

                  if (total_distance[0] < total_distance[1]) {
                    index1 = 1;
                    index2 = 2;
                  } else {
                    index1 = 0;
                    index2 = 1;
                  }

                  let square_1 = {
                    square: standard[index1],
                    idx_1: 1,
                    idx_2: 2
                  }

                  let square_2 = {
                    square: standard[index2],
                    idx_1: 0,
                    idx_2: 3
                  }

                  newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                  return newPointArr

                }

                function stick_makeup(standard, side, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];
                  let top_temp = [...standard];
                  let bottom_temp = [...side];

                  standard = [standard[2]];
                  side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                let result_top = judge(top);
                let result_bottom = judge(bottom);

                //其中一邊為間隔
                if (result_top || result_bottom) {

                  if (result_top && result_bottom) {

                    top = no_stick_makeup(top);
                    bottom = no_stick_makeup(bottom);
                    fix_rect_angle = top.concat(bottom)

                  } else if (result_top) {

                    let side = bottom;
                    fix_rect_angle = no_stick_makeup(top);
                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixBottom)

                  } else if (result_bottom) {

                    let side = top
                    fix_rect_angle = no_stick_makeup(bottom);
                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixTop)
                  }

                }

                //上下方的三格都相黏並且為對角
                if (!result_top && !result_bottom) {

                  let val_1 = top[0].cntPoint[2].x / bottom[2].cntPoint[0].x;
                  let val_2 = top[1].cntPoint[2].x / bottom[1].cntPoint[0].x;

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup(top, bottom, data.fixBottom, data.fixTop)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup(bottom, top, data.fixTop, data.fixBottom)
                  }

                  console.log(val_1, val_2)
                }

              }

              let three_and_two = function (top, bottom) {


                function three_rectangle_judge(standard) {

                  let temp_x = 0, temp_y = 0, judge = false;

                  standard.forEach(function (ele) {
                    temp_x += ele.cntInfo.center.x;
                  })

                  let val = (temp_x / 3 / standard[1].cntInfo.center.x).toFixed(3)

                  if (val > 0.995 && val < 1.005)
                    judge = false
                  else
                    judge = true

                  return [judge]

                }

                function two_rectangle_judge(standard) {

                  let splitX = 0, splitY = 0, p1 = 0, p2 = 1;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;

                  standard.forEach(function (ele) {

                    let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                    let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                    let val = distance / length

                    if (val > 1.3 && val < 1.7) {
                      spacing_big = true; spacing_mid = false; spacing_small = false;
                      console.log('spacing_big')
                    }
                    if (val > 0.85 && val < 1.3) {
                      spacing_mid = true; spacing_big = false; spacing_small = false;
                      console.log('spacing_mid')
                    }

                    if (val > 0.4 && val < 0.65) {
                      spacing_small = true; spacing_mid = false; spacing_big = false;
                      console.log('spacing_small')
                    }

                  })


                  return [spacing_big, spacing_mid, spacing_small]

                }

                function three_calc_stick_makeup(standard) {

                  let newPointArr = [...standard];
                  let total_distance = [];
                  let index1, index2;
                  let x = 0, y = 0, cntPoint = [];

                  for (let index = 0; index < standard.length - 1; index++) {
                    let index1 = index;
                    let index2 = index + 1;
                    let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                      + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                    total_distance.push(distance)
                  }

                  if (total_distance[0] < total_distance[1]) {
                    index1 = 1;
                    index2 = 2;
                  } else {
                    index1 = 0;
                    index2 = 1;
                  }

                  let square_1 = {
                    square: standard[index1],
                    idx_1: 1,
                    idx_2: 2
                  }

                  let square_2 = {
                    square: standard[index2],
                    idx_1: 0,
                    idx_2: 3
                  }

                  newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                  newPointArr.sort(function (a, b) {
                    return a.cntInfo.center.x - b.cntInfo.center.x;
                  });

                  return newPointArr

                }

                function two_calc_big_makeup(pointArr, idx1, idx2, idx3, idx4) {

                  let new_array = [...pointArr]

                  let square_1 = {
                    square: pointArr[0],
                    idx_1: 1,
                    idx_2: 2
                  }

                  let square_2 = {
                    square: pointArr[1],
                    idx_1: 0,
                    idx_2: 3
                  }

                  let result = two_rectangle_big_calc(square_1, square_2)

                  new_array.push(result[0])
                  new_array.push(result[1])

                  return new_array;
                }

                function stick_makeup(standard, side, top_temp, bottom_temp, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  // let top_temp = [...standard];
                  // let bottom_temp = [...side];
                  // standard = [standard[1], standard[2]];
                  // side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                let top_judge = '', bottom_judge = ''

                if (top.length == 2) {
                  top_judge = two_rectangle_judge(top)
                } else if (top.length == 3) {
                  top_judge = three_rectangle_judge(top)
                }

                if (bottom.length == 2) {
                  bottom_judge = two_rectangle_judge(bottom)
                } else if (bottom.length == 3) {
                  bottom_judge = three_rectangle_judge(bottom)
                }

                //兩邊或其中一邊滿足條件
                if (top_judge[0] || bottom_judge[0]) {

                  if (top_judge[0] && bottom_judge[0]) {

                    if (top_judge.length < bottom_judge.length) {

                      top = three_calc_stick_makeup(top)

                      bottom = two_calc_big_makeup(bottom, 0, 1, 2, 3)

                    } else {

                      top = two_calc_big_makeup(top, 0, 1, 2, 3)

                      bottom = three_calc_stick_makeup(bottom)

                    }

                    fix_rect_angle = top.concat(bottom)

                    console.log('兩邊都滿足條件 分別可以自補')

                  } else {

                    if (top_judge[0]) {

                      let side = bottom;
                      if (top_judge.length === 1) {
                        fix_rect_angle = three_calc_stick_makeup(top)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixBottom)
                      } else {
                        fix_rect_angle = two_calc_big_makeup(top, 0, 1, 2, 3)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixBottom)
                      }

                    } else if (bottom_judge[0]) {

                      let side = top;
                      if (bottom_judge.length === 1) {
                        fix_rect_angle = three_calc_stick_makeup(bottom)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixTop)
                      } else {
                        fix_rect_angle = two_calc_big_makeup(bottom, 0, 1, 2, 3)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixTop)
                      }
                    }

                    console.log('其中一邊滿足條件')
                  }

                } else {

                  if (top_judge.length == 1) {

                    // 上三下二

                    if (bottom_judge[2]) {

                      let val_1 = top[0].cntPoint[3].x / bottom[1].cntPoint[0].x
                      let val_2 = top[2].cntPoint[2].x / bottom[1].cntPoint[0].x

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([top[1], top[2]], [bottom[0]], top, bottom, data.fixBottom, data.fixTop)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([top[0], top[1]], [bottom[1]], top, bottom, data.fixBottom, data.fixTop)

                      console.log('3 to 2 big')
                    }

                    if (bottom_judge[1]) {

                      let val_1 = top[0].cntPoint[3].x / bottom[0].cntPoint[1].x
                      let val_2 = top[2].cntPoint[2].x / bottom[1].cntPoint[0].x

                      console.log(val_1, val_2)

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([top[0], top[2]], [bottom[0]], top, bottom, data.fixBottom, data.fixTop)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([top[0], top[2]], [bottom[1]], top, bottom, data.fixBottom, data.fixTop)

                      console.log('3 to 2 mid')
                    }

                  }

                  if (bottom_judge.length == 1) {

                    // 上二下三

                    if (top_judge[2]) {

                      let val_1 = bottom[0].cntPoint[0].x / top[0].cntPoint[2].x
                      let val_2 = bottom[2].cntPoint[1].x / top[1].cntPoint[3].x

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([bottom[1], bottom[2]], [top[0]], top, bottom, data.fixTop, data.fixBottom)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([bottom[0], bottom[1]], [top[1]], top, bottom, data.fixTop, data.fixBottom)

                    }


                    if (top_judge[1]) {

                      let val_1 = bottom[0].cntPoint[0].x / top[0].cntPoint[2].x
                      let val_2 = bottom[2].cntPoint[1].x / top[1].cntPoint[3].x

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([bottom[0], bottom[2]], [top[0]], top, bottom, data.fixTop, data.fixBottom)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([bottom[0], bottom[2]], [top[1]], top, bottom, data.fixTop, data.fixBottom)

                    }

                  }

                }

              }

              let judge_filter = dict[top.length][bottom.length];

              if (judge_filter == '22')
                two_and_two(top, bottom)

              if (judge_filter == '33')
                three_and_three(top, bottom)

              if (judge_filter == '32' || judge_filter == '23')
                three_and_two(top, bottom)


              if (fix_rect_angle.length)
                return fix_rect_angle
              else if (!fix_rect_angle.length) {

                top = A8_sheet_makeup(top, 0, 0)
                bottom = A8_sheet_makeup(bottom, 0, 0)
                fix_rect_angle = top.concat(bottom)
                console.log('沒有矩形可以參考!!!!!')

                return fix_rect_angle
              } else {

                return top.concat(bottom)
              }

            }

            let split_rectangle = split_judge_rectangle(rectangle_point)

            switch (split_rectangle[0]) {
              case 'f0':
                /**
                 * 0:0 0:1 1:0 1:1
                 */
                rectangle_result = rectangle_point.slice(0);
                break;
              case 'f2':
                /**
                 * 4:0 4:1 4:2 4:3
                 */
                rectangle_result = f2_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              case 'f1':
                /**
                 * 3:0 2:0 3:1 2:1
                 */
                rectangle_result = f1_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              case 'f3':
                /**
                 * 3:2 3:3 2:2
                 */
                rectangle_result = f3_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              default:
                console.log('null');
            }

            return AllSortRectangleV2(rectangle_result);
          }

          let test2 = function (rectangle_point, result_x, result_y) {

            // top -> right
            // bottom -> left

            let rectangle_result = [];

            /**
             * @return {String} Array[0] - filter class
             * @return {Array} Array[1] - top rectangle
             * @return {Array} Array[2] - bottom rectangle
             */
            let split_judge_rectangle = function (rectangle_point) {

              let split_Right = [], split_Left = [], split_Mid = [], filter_calss = 'f0';
              let filter_dict = [
                ['f0', 'f0', 'f1', 'f1', 'f2'],
                ['f0', 'f0', 'f1', 'f1', 'f2'],
                ['f1', 'f1', 'f3', 'f3', 'f2'],
                ['f1', 'f1', 'f3', 'f3', 'f2'],
                ['f2', 'f2', 'f2', 'f2', 'f0']
              ]

              if (rectangle_point.length == 0) {
                filter_calss = 'f0';
                return [filter_calss, split_Left, split_Right];
              }

              //判斷
              let spllit_calc = function (rectangle_point, result_x, result_y) {

                let threshold = 10000;

                let slope = (rectangle_point[0]['cntPoint'][1].y - rectangle_point[0]['cntPoint'][2].y) /
                  (rectangle_point[0]['cntPoint'][1].x - rectangle_point[0]['cntPoint'][2].x)

                console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                console.log((rectangle_point[0]['cntPoint'][1].x - rectangle_point[0]['cntPoint'][2].x))

                if (!isFinite(slope)) {
                  slope = (rectangle_point[0]['cntPoint'][1].y - rectangle_point[0]['cntPoint'][2].y) /
                    ((rectangle_point[0]['cntPoint'][1].x + 1) - (rectangle_point[0]['cntPoint'][2].x - 1))
                }

                /**
                 * 計算y軸為0的x值
                 * (?,videoheight)
                 */

                let start_y = tempHeight;
                let start_x = (start_y + slope * result_x - result_y) / slope
                let start_point = new cv.Point(start_x, start_y)

                /**
                 * 計算y軸為videoheight的x值
                 * (?,videoheight)
                 */
                let end_y = 0;
                let end_x = (end_y + slope * result_x - result_y) / slope
                let end_point = new cv.Point(end_x, end_y)
                cv.line(drawDst, start_point, end_point, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)

                console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
                console.log((end_point.x - start_point.x))

                console.log('------------------------------')
                rectangle_point.forEach(function (ele) {

                  let x0 = start_point.x;
                  let y0 = start_point.y;

                  let x1 = end_point.x;
                  let y1 = end_point.y;

                  let x2 = ele.cntInfo.center.x;
                  let y2 = ele.cntInfo.center.y;

                  let val = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)

                  console.log(val)


                  if (val < threshold && val > -threshold)
                    split_Mid.push(ele)
                  else if (val > threshold)
                    split_Right.push(ele)
                  else if (val < -threshold)
                    split_Left.push(ele)


                })

                if (split_Mid.length) {
                  if (result_x > tempWidth / 2) {
                    split_Right = split_Mid;
                    split_Mid = [];
                    split_Left = [];
                  }

                  if (result_x < tempWidth / 2) {
                    split_Left = split_Mid;
                    split_Mid = [];
                    split_Right = [];
                  }
                }

                console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

                let right_val = split_Right.length;
                let left_val = split_Left.length;
                filter_calss = filter_dict[left_val][right_val]


                console.log([filter_calss, split_Left, split_Right])
                return [filter_calss, split_Left, split_Right]

              }


              return spllit_calc(rectangle_point, result_x, result_y);
            }

            /**
            * 延伸修正矩形 rectangle_calc()
            * @param {Array} standard - 一邊四個完整的矩形
            * @param {Array} side - 另一邊不完整的矩形
            * @param {Array} fixdata - 修正需要使用到矩形頂點index號碼
            * @return {Array} - 回傳補正後的矩形
            */
            let rectangle_calc = (standard, side, fixdata) => {

              let x, y, cntPoint = [];

              if (!(typeof standard === "undefined") && !(typeof side === "undefined")) {
                /**
                 * 其中一邊為4個矩形
                 * 另一邊有1個以上的矩形
                 * 或
                 * 另一邊為0個矩形
                 */
                if (side.length) {


                  let two_check = false, three_check = false;

                  function judge_two() {


                    let splitX = 0, splitY = 0, p1 = 1, p2 = 2;
                    let spacing_big = false, spacing_small = false, spacing_mid = false;
                    let calc_idx = {
                      'right': {
                        'top': {
                          'idx1': 0,
                          'idx2': 0,
                          'index1': [2, 1],
                          'index2': [0, 1]
                        },
                        'bottom': {
                          'idx1': 1,
                          'idx2': 0,
                          'index1': [1, 2],
                          'index2': [3, 2]
                        }
                      },
                      'left': {
                        'top': {
                          'idx1': 0,
                          'idx2': 0,
                          'index1': [3, 0],
                          'index2': [1, 0]
                        },
                        'bottom': {
                          'idx1': 1,
                          'idx2': 0,
                          'index1': [0, 3],
                          'index2': [2, 3]
                        }
                      }

                    }

                    for (let i = 0; i < side.length; i++) {
                      splitX += side[i]['cntInfo'].center.x;
                      splitY += side[i]['cntInfo'].center.y;
                    }
                    splitX /= side.length;
                    splitY /= side.length;

                    side.forEach(function (ele) {

                      let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                      let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                      let val = distance / length

                      if (val > 1.3 && val < 1.7) {
                        spacing_big = true; spacing_mid = false; spacing_small = false;
                        console.log('spacing_big')
                      }
                      if (val > 0.85 && val < 1.3) {
                        spacing_mid = true; spacing_big = false; spacing_small = false;
                        //console.log('spacing_mid')
                      }

                      if (val > 0.4 && val < 0.65) {
                        spacing_small = true; spacing_mid = false; spacing_big = false;
                        //console.log('spacing_small')
                      }

                    })


                    return spacing_big
                  }

                  function judge_three() {

                    let temp_x = 0, temp_y = 0, judge = false;

                    side.forEach(function (ele) {
                      temp_x += ele.cntInfo.center.y;
                    })

                    let val = (temp_x / 3 / side[1].cntInfo.center.y).toFixed(3)

                    if (val > 0.95 && val < 1.05)
                      judge = false
                    else
                      judge = true

                    return judge

                  }

                  /**
                   * 如果可以直接補正不做延伸的判斷
                   */
                  if (side.length == 2)
                    two_check = judge_two()

                  if (side.length == 3)
                    three_check = judge_three()

                  console.log(two_check, three_check)

                  if (two_check)
                    side = A8_sheet_makeup(side, 0, 0)

                  if (three_check)
                    side = A8_sheet_makeup(side, 0, 0)

                  if (!two_check && !three_check) {
                    let total_index = [0, 1, 2, 3]
                    /**
                      * 判斷兩邊缺失的矩形
                      */
                    for (let k = 0; k < side.length; k++) {

                      for (let j = 0; j < standard.length; j++) {

                        let valx = (side[k].cntPoint[fixdata[0]].y / standard[j].cntPoint[fixdata[1]].y).toFixed(3)
                        //let valy = (side[j].cntPoint[fixdata[0]].y / standard[k].cntPoint[fixdata[1]].y).toFixed(3)

                        if (valx > 0.92 && valx < 1.08)
                          total_index.splice(total_index.indexOf(j), 1);

                      }
                    }

                    /**
                      * 補正缺失矩形
                      */
                    for (let j = 0; j < total_index.length; j++) {

                      let value = total_index[j]

                      x = standard[value].cntPoint[fixdata[1]].x;
                      y = standard[value].cntPoint[fixdata[1]].y;
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = standard[value].cntPoint[fixdata[3]].x;
                      y = standard[value].cntPoint[fixdata[3]].y;
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = (2 * standard[value].cntPoint[fixdata[1]].x - 1 * standard[value].cntPoint[fixdata[0]].x) / (2 - 1)
                      y = (2 * standard[value].cntPoint[fixdata[1]].y - 1 * standard[value].cntPoint[fixdata[0]].y) / (2 - 1)
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })
                      x = (2 * standard[value].cntPoint[fixdata[3]].x - 1 * standard[value].cntPoint[fixdata[2]].x) / (2 - 1)
                      y = (2 * standard[value].cntPoint[fixdata[3]].y - 1 * standard[value].cntPoint[fixdata[2]].y) / (2 - 1)
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                      cntPoint.push({ 'x': x, 'y': y })

                      side.push(calcCntInfo(cntPoint));
                      cntPoint = [];

                    }


                  }


                } else {

                  /**
                    * 另一邊為0個矩形
                    * 補正缺失矩形
                    */
                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata[1]].x;
                    y = standard[k].cntPoint[fixdata[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata[3]].x;
                    y = standard[k].cntPoint[fixdata[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    side.push(calcCntInfo(cntPoint));
                    cntPoint = [];

                  }
                }

              }

              const total = standard.concat(side);

              return total;
            };

            /**
             * 4:0 4:1 4:2 4:3
             * @param {Array} top - 分割後上方的矩形
             * @param {Array} bottom - 分割下上方的矩形
             * @return {Array} - 回傳補正後的矩形
             */
            let f2_extends_rectangle = function (left, right) {

              let data = {
                'fixRight': [0, 1, 3, 2],
                'fixLeft': [1, 0, 2, 3]
              }

              const result = (left.length > right.length) ? rectangle_calc(left, right, data.fixRight) : rectangle_calc(right, left, data.fixLeft);
              return result
            }

            /**
             * @param {Array} top - 分割後上方的矩形
             * @param {Array} bottom - 分割下上方的矩形
             * @return {Array} - 回傳補正後的矩形
             */
            let f1_extends_rectangle = function (left, right) {

              let fix_rect_angle = []

              let data = {
                'fixRight': [0, 1, 3, 2],
                'fixLeft': [1, 0, 2, 3]
              }

              /**
               * 其中一邊矩形為0個 另一邊矩形有3個或2個
               * 或是
              * 其中一邊矩形為1個 另一邊矩形有3個或2個
               */
              if (!(left.length) || !(right.length)) {

                let calc = function (standard, side, fixdata) {

                  let splitX = 0, splitY = 0;

                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;

                  if (!side.length) {
                    standard = A8_sheet_makeup(standard, splitX, splitY);
                    side = [];
                  }

                  let x, y, cntPoint = [];

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata[1]].x;
                    y = standard[k].cntPoint[fixdata[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata[3]].x;
                    y = standard[k].cntPoint[fixdata[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    side.push(calcCntInfo(cntPoint));
                    cntPoint = [];

                  }

                  if (standard.length == 4)
                    return rectangle_calc(standard, side, fixdata)
                  else
                    return standard.concat(side)

                }

                fix_rect_angle = (left.length > right.length) ? calc(left, right, data.fixRight) : calc(right, left, data.fixLeft)

              } else {
                //其中一邊矩形為1個 另一邊矩形有2個
                let one_and_two = function (standard, side, fixdata, diect) {

                  let splitX = 0, splitY = 0, p1 = 1, p2 = 2;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  let calc_idx = {
                    'right': {
                      'top': {
                        'idx1': 0,
                        'idx2': 0,
                        'index1': [2, 1],
                        'index2': [0, 1]
                      },
                      'bottom': {
                        'idx1': 1,
                        'idx2': 0,
                        'index1': [1, 2],
                        'index2': [3, 2]
                      }
                    },
                    'left': {
                      'top': {
                        'idx1': 0,
                        'idx2': 0,
                        'index1': [3, 0],
                        'index2': [1, 0]
                      },
                      'bottom': {
                        'idx1': 1,
                        'idx2': 0,
                        'index1': [0, 3],
                        'index2': [2, 3]
                      }
                    }

                  }

                  function judge() {

                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;

                    standard.forEach(function (ele) {

                      let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                      let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                      let val = distance / length

                      if (val > 1.3 && val < 1.7) {
                        spacing_big = true; spacing_mid = false; spacing_small = false;
                        console.log('spacing_big')
                      }
                      if (val > 0.85 && val < 1.3) {
                        spacing_mid = true; spacing_big = false; spacing_small = false;
                        console.log('spacing_mid')
                      }

                      if (val > 0.4 && val < 0.65) {
                        spacing_small = true; spacing_mid = false; spacing_big = false;
                        console.log('spacing_small')
                      }

                    })

                  }

                  function big_calc(pointArr, idx1, idx2, idx3, idx4) {

                    let new_array = [...pointArr]

                    let square_1 = {
                      square: pointArr[0],
                      idx_1: 2,
                      idx_2: 3
                    }

                    let square_2 = {
                      square: pointArr[1],
                      idx_1: 1,
                      idx_2: 0
                    }

                    let result = two_rectangle_big_calc(square_1, square_2)

                    new_array.push(result[0])
                    new_array.push(result[1])

                    return new_array;
                  }

                  function mid_2_calc(standard, side, idx1, idx2, idx3, idx4, index) {

                    let p1, p2, p3, p4, a1, b1, c1, a2, b2, c2, det;
                    let Intersection = function () {
                      a1 = p2.y - p1.y;
                      b1 = p1.x - p2.x;
                      c1 = p1.x * p2.y - p2.x * p1.y;
                      a2 = p4.y - p3.y;
                      b2 = p3.x - p4.x;
                      c2 = p3.x * p4.y - p4.x * p3.y;
                      det = a1 * b2 - a2 * b1;
                    }

                    let new_array = [...standard]
                    let x = 0, y = 0, cntPoint = [];

                    p1 = { 'x': standard[index.idx1].cntPoint[index.index1[0]].x, 'y': standard[index.idx1].cntPoint[index.index1[0]].y }
                    p2 = { 'x': standard[index.idx1].cntPoint[index.index1[1]].x, 'y': standard[index.idx1].cntPoint[index.index1[1]].y }
                    p3 = { 'x': side[index.idx2].cntPoint[index.index2[0]].x, 'y': side[index.idx2].cntPoint[index.index2[0]].y }
                    p4 = { 'x': side[index.idx2].cntPoint[index.index2[1]].x, 'y': side[index.idx2].cntPoint[index.index2[1]].y }
                    Intersection();

                    x = (c1 * b2 - c2 * b1) / det
                    y = (a1 * c2 - a2 * c1) / det
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (standard[index.idx1].cntPoint[index.index2[0]].x)
                    y = (standard[index.idx1].cntPoint[index.index2[0]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (standard[index.idx1].cntPoint[index.index2[1]].x)
                    y = (standard[index.idx1].cntPoint[index.index2[1]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    x = (side[index.idx2].cntPoint[index.index2[1]].x)
                    y = (side[index.idx2].cntPoint[index.index2[1]].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    new_array.push(calcCntInfo(cntPoint))

                    cntPoint = [];
                    x = (standard[0].cntPoint[idx2].x)
                    y = (standard[0].cntPoint[idx2].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[0].cntPoint[idx3].x)
                    y = (standard[0].cntPoint[idx3].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[1].cntPoint[idx1].x)
                    y = (standard[1].cntPoint[idx1].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })
                    x = (standard[1].cntPoint[idx4].x)
                    y = (standard[1].cntPoint[idx4].y)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    cntPoint.push({ 'x': x, 'y': y })

                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                    return new_array;
                  }

                  function smail_calc(standard, side, index, standIdx) {

                    //第三個參數為side的index
                    let new_array = [...standard]
                    let x = 0, y = 0, cntPoint = [];

                    x = (2 * side[0].cntPoint[index[1]].x - 1 * side[0].cntPoint[index[0]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[1]].y - 1 * side[0].cntPoint[index[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[0].cntPoint[index[3]].x - 1 * side[0].cntPoint[index[2]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[3]].y - 1 * side[0].cntPoint[index[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[1]].x
                    y = side[0].cntPoint[index[1]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[3]].x
                    y = side[0].cntPoint[index[3]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];


                    x = (2 * side[0].cntPoint[index[3]].x - 1 * side[0].cntPoint[index[2]].x) / (2 - 1)
                    y = (2 * side[0].cntPoint[index[3]].y - 1 * side[0].cntPoint[index[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[0].cntPoint[index[3]].x
                    y = side[0].cntPoint[index[3]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[standIdx].cntPoint[index[0]].x
                    y = standard[standIdx].cntPoint[index[0]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[standIdx].cntPoint[index[1]].x
                    y = standard[standIdx].cntPoint[index[1]].y
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                    new_array.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                    return new_array
                  }

                  judge();

                  console.log(spacing_big, spacing_mid, spacing_small)

                  if (spacing_big) {
                    standard = big_calc(standard, 1, 2, 3, 0);
                    fix_rect_angle = rectangle_calc(standard, side, fixdata)
                  }

                  if (spacing_mid) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;

                    if (diect == 'right') {

                      console.log(diect)

                      let val_1 = standard[0].cntPoint[0].y / side[0].cntPoint[2].y;
                      let val_2 = standard[1].cntPoint[3].y / side[0].cntPoint[1].y;

                      console.log(val_1, val_2)

                      if ((val_1 > 0.9 && val_1 < 1.05))
                        standard = mid_2_calc(standard, side, 1, 2, 3, 0, calc_idx.right.top)

                      if ((val_2 > 0.9 && val_2 < 1.05))
                        standard = mid_2_calc(standard, side, 1, 2, 3, 0, calc_idx.right.bottom)

                      if (!((val_1 > 0.9 && val_1 < 1.05) || (val_2 > 0.9 && val_2 < 1.05)))
                        standard = A8_sheet_makeup(standard, splitX, splitY);

                    }

                    if (diect == 'left') {

                      console.log(diect)
                      let val_1 = standard[0].cntPoint[1].y / side[0].cntPoint[3].y;
                      let val_2 = standard[1].cntPoint[2].y / side[0].cntPoint[0].y;

                      if ((val_1 > 0.9 && val_1 < 1.05)) {
                        standard = mid_2_calc(standard, side, 1, 2, 3, 0, calc_idx.left.top)
                      }

                      if ((val_2 > 0.9 && val_2 < 1.05)) {
                        standard = mid_2_calc(standard, side, 1, 2, 3, 0, calc_idx.left.bottom)
                      }

                      if (!((val_1 > 0.9 && val_1 < 1.05) || (val_2 > 0.9 && val_2 < 1.05))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                      }

                    }

                    if (standard.length == 4) {
                      fix_rect_angle = rectangle_calc(standard, side, fixdata)
                    }
                  }

                  if (spacing_small) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;


                    if (diect == 'right') {

                      let val_1 = (standard[0].cntPoint[0].y - side[0].cntPoint[2].y) / 200;
                      let val_2 = (standard[1].cntPoint[3].y - side[0].cntPoint[1].y) / 200;

                      console.log(val_1, val_2)

                      if (val_1 < 1.25 && val_1 > 0.90) {
                        standard = smail_calc(standard, side, [0, 1, 3, 2], 0)
                        console.log('top')
                      }

                      if (val_2 < -0.8 && val_2 > -1.25) {

                        standard = smail_calc(standard, side, [3, 2, 0, 1], 1)
                        console.log('bottom')
                      }

                      if (!(val_1 < 1.25 && val_1 > 0.90) && !(val_2 < -0.8 && val_2 > -1.25)) {
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                        console.log('und')
                      }


                    }

                    if (diect == 'left') {

                      let val_1 = (standard[0].cntPoint[1].y - side[0].cntPoint[3].y) / 200;
                      let val_2 = (standard[1].cntPoint[2].y - side[0].cntPoint[0].y) / 200;


                      if (val_1 < 1.25 && val_1 > 0.90) {

                        standard = smail_calc(standard, side, [1, 0, 2, 3], 0)
                        console.log('top')
                      }

                      if (val_2 < -0.8 && val_2 > -1.25) {
                        standard = smail_calc(standard, side, [2, 3, 1, 0], 1)
                        console.log('bottom')
                      }

                      if (!(val_1 < 1.25 && val_1 > 0.90) && !(val_2 < -0.8 && val_2 > -1.25)) {
                        standard = A8_sheet_makeup(standard, splitX, splitY);
                        console.log('und')
                      }

                    }

                    if (standard.length == 4) {
                      fix_rect_angle = rectangle_calc(standard, side, fixdata)
                    }


                  }

                }

                let one_and_three = function (standard, side, fixdata, diect) {

                  function judge() {

                    let temp_x = 0, temp_y = 0, judge = 0;

                    standard.forEach(function (ele) {
                      temp_y += ele.cntInfo.center.y;
                    })

                    let val = (temp_y / 3 / standard[1].cntInfo.center.y).toFixed(3)

                    if (val > 0.92 && val < 1.08)
                      judge = 1
                    else
                      judge = 0

                    return judge

                  }

                  function rect_is_stick(standard, side, fixdata, diect) {

                    let splitX = 0, splitY = 0;
                    for (let i = 0; i < standard.length; i++) {
                      splitX += standard[i]['cntInfo'].center.x;
                      splitY += standard[i]['cntInfo'].center.y;
                    }
                    splitX /= standard.length;
                    splitY /= standard.length;


                    if (diect == 'right') {

                      let val_1 = standard[0].cntPoint[0].y / side[0].cntPoint[2].y;
                      let val_2 = standard[2].cntPoint[3].y / side[0].cntPoint[1].y;

                      console.log(val_1, val_2)

                      if (val_1 < 1.1 && val_1 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'top')
                        console.log('top')
                      }

                      if (val_2 < 1.1 && val_2 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'bottom')
                        console.log('bottom')
                      }

                      if (!((val_1 < 1.1 && val_1 > 0.9)) && !((val_2 < 1.1 && val_2 > 0.9))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY)
                        console.log('und')
                      }

                    }

                    if (diect == 'left') {

                      let val_1 = standard[0].cntPoint[1].y / side[0].cntPoint[3].y;
                      let val_2 = standard[2].cntPoint[2].y / side[0].cntPoint[0].y;

                      if (val_1 < 1.1 && val_1 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'top')
                        console.log('top')
                      }

                      if (val_2 < 1.1 && val_2 > 0.9) {

                        standard = A8_sheet_makeup(standard, splitX, splitY, 'bottom')
                        console.log('bottom')
                      }

                      if (!((val_1 < 1.1 && val_1 > 0.9)) && !((val_2 < 1.1 && val_2 > 0.9))) {
                        standard = A8_sheet_makeup(standard, splitX, splitY)
                        console.log('und')
                      }


                    }

                    if (standard.length == 4)
                      fix_rect_angle = rectangle_calc(standard, side, fixdata)


                  }

                  function rect_no_stick(standard, side, fixdata, diect) {

                    let no_stick_makeup = function (standard) {

                      let newPointArr = [...standard];
                      let total_distance = [];
                      let index1, index2;
                      let x = 0, y = 0, cntPoint = [];

                      for (let index = 0; index < standard.length - 1; index++) {
                        let index1 = index;
                        let index2 = index + 1;
                        let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                          + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                        total_distance.push(distance)
                      }

                      if (total_distance[0] < total_distance[1]) {
                        index1 = 1;
                        index2 = 2;
                      } else {
                        index1 = 0;
                        index2 = 1;
                      }

                      let square_1 = {
                        square: standard[index1],
                        idx_1: 2,
                        idx_2: 3
                      }

                      let square_2 = {
                        square: standard[index2],
                        idx_1: 0,
                        idx_2: 1
                      }

                      newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                      newPointArr.sort(function (a, b) {
                        return a.cntInfo.center.y - b.cntInfo.center.y;
                      });

                      return newPointArr
                    }

                    fix_rect_angle = no_stick_makeup(standard);

                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, fixdata)
                  }

                  const stick = judge()

                  stick ? rect_is_stick(standard, side, fixdata, diect) : rect_no_stick(standard, side, fixdata, diect)

                }

                let dict = [
                  [null, null, null, null],
                  [null, null, '12', '13'],
                  [null, '21', null, null],
                  [null, '31', null, null]
                ]

                let judge_filter = dict[left.length][right.length];


                if (judge_filter == '12' || judge_filter == '21') {
                  (left.length > right.length) ? one_and_two(left, right, data.fixRight, 'left') : one_and_two(right, left, data.fixLeft, 'right')
                }

                if (judge_filter == '13' || judge_filter == '31') {
                  (left.length > right.length) ? one_and_three(left, right, data.fixRight, 'left') : one_and_three(right, left, data.fixLeft, 'right')

                }

              }


              return fix_rect_angle
            }

            let f3_extends_rectangle = function (left, right) {

              let data = {
                'fixRight': [0, 1, 3, 2],
                'fixLeft': [1, 0, 2, 3]
              }

              let fix_rect_angle = [];

              let dict = [
                [null, null, null, null, null],
                [null, null, null, null, null],
                [null, null, '22', '23', null],
                [null, null, '32', '33', null],
                [null, null, null, null, null]
              ]

              let two_and_two = function (left, right) {

                function judge(standard) {

                  let splitX = 0, splitY = 0, p1 = 1, p2 = 2;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;

                  standard.forEach(function (ele) {

                    let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                    let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                    let val = distance / length

                    if (val > 1.3 && val < 1.7) {
                      spacing_big = true; spacing_mid = false; spacing_small = false;
                      //console.log('spacing_big')
                    }
                    if (val > 0.85 && val < 1.3) {
                      spacing_mid = true; spacing_big = false; spacing_small = false;
                      //console.log('spacing_mid')
                    }

                    if (val > 0.4 && val < 0.65) {
                      spacing_small = true; spacing_mid = false; spacing_big = false;
                      //console.log('spacing_small')
                    }

                  })


                  return [spacing_big, spacing_mid, spacing_small]
                }

                function big_calc(pointArr, idx1, idx2, idx3, idx4) {

                  let new_array = [...pointArr]

                  let square_1 = {
                    square: pointArr[0],
                    idx_1: 2,
                    idx_2: 3
                  }

                  let square_2 = {
                    square: pointArr[1],
                    idx_1: 1,
                    idx_2: 0
                  }

                  let result = two_rectangle_big_calc(square_1, square_2)

                  new_array.push(result[0])
                  new_array.push(result[1])

                  return new_array;
                }

                function mid_and_small_calc(standard, side, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  let top_temp = [...standard];
                  let bottom_temp = [...side];


                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                function stick_makeup(standard, side, left, right, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  let top_temp = [...left];
                  let bottom_temp = [...right];
                  // standard = [standard[1], standard[2]];
                  // side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];
                  }

                  top_temp = A8_sheet_makeup(top_temp, 0, 0)
                  bottom_temp = A8_sheet_makeup(bottom_temp, 0, 0)

                  return top_temp.concat(bottom_temp)
                }

                let result_left = judge(left);
                let result_right = judge(right);

                if (result_left[0] || result_right[0]) {

                  if (result_left[0] && result_right[0]) {
                    left = big_calc(left, 1, 2, 3, 0);
                    right = big_calc(right, 1, 2, 3, 0);
                    fix_rect_angle = left.concat(right)
                  } else if (result_left[0]) {
                    let standard = big_calc(left, 1, 2, 3, 0);
                    let side = right;
                    fix_rect_angle = rectangle_calc(standard, side, data.fixRight)
                  } else if (result_right[0]) {
                    let standard = big_calc(right, 1, 2, 3, 0);
                    let side = left;
                    fix_rect_angle = rectangle_calc(standard, side, data.fixLeft)
                  }

                }

                if (result_left[1] && result_right[1]) {

                  let val_1 = left[0].cntPoint[1].y / right[0].cntPoint[0].y
                  let val_2 = left[1].cntPoint[1].y / right[1].cntPoint[0].y

                  if (!((val_1 < 1.1 && val_1 > 0.95) && (val_2 < 1.1 && val_2 > 0.95))) {
                    fix_rect_angle = mid_and_small_calc(left, right, data.fixRight, data.fixLeft)
                    console.log('mid and mid')
                  }

                }

                if (result_left[2] && result_right[2]) {

                  let val_1 = left[0].cntPoint[1].y / right[1].cntPoint[3].y;
                  let val_2 = left[1].cntPoint[2].y / right[0].cntPoint[0].y;

                  if (val_1 < 1.1 && val_1 > 0.9 || val_2 < 1.1 && val_2 > 0.9)
                    fix_rect_angle = mid_and_small_calc(left, right, data.fixRight, data.fixLeft)

                  console.log('small')
                }

                if (result_left[2] && result_right[1]) {

                  let val_1 = left[1].cntPoint[1].y / right[1].cntPoint[3].y
                  let val_2 = left[1].cntPoint[1].y / right[0].cntPoint[0].y

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup([left[1]], [right[0]], left, right, data.fixRight, data.fixLeft)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup([left[0]], [right[1]], left, right, data.fixRight, data.fixLeft)
                  }

                }

                if (result_left[1] && result_right[2]) {

                  let val_1 = left[1].cntPoint[1].y / right[0].cntPoint[0].y
                  let val_2 = left[0].cntPoint[1].y / right[0].cntPoint[3].y

                  console.log(val_1, val_2)

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup([left[0]], [right[1]], left, right, data.fixRight, data.fixLeft)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup([left[1]], [right[0]], left, right, data.fixRight, data.fixLeft)
                  }

                }

              }

              let three_and_three = function (left, right) {

                function judge(standard) {

                  let temp_x = 0, temp_y = 0, judge = 0;

                  standard.forEach(function (ele) {
                    temp_y += ele.cntInfo.center.y;
                  })

                  let val = (temp_y / 3 / standard[1].cntInfo.center.y).toFixed(3)

                  if (val > 0.995 && val < 1.005)
                    judge = 0
                  else
                    judge = 1

                  return judge

                }

                function no_stick_makeup(standard) {

                  let newPointArr = [...standard];
                  let total_distance = [];
                  let index1, index2;
                  let x = 0, y = 0, cntPoint = [];

                  for (let index = 0; index < standard.length - 1; index++) {
                    let index1 = index;
                    let index2 = index + 1;
                    let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                      + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                    total_distance.push(distance)
                  }

                  if (total_distance[0] < total_distance[1]) {
                    index1 = 1;
                    index2 = 2;
                  } else {
                    index1 = 0;
                    index2 = 1;
                  }

                  let square_1 = {
                    square: standard[index1],
                    idx_1: 2,
                    idx_2: 3
                  }

                  let square_2 = {
                    square: standard[index2],
                    idx_1: 0,
                    idx_2: 1
                  }

                  newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                  newPointArr.sort(function (a, b) {
                    return a.cntInfo.center.y - b.cntInfo.center.y;
                  });

                  return newPointArr

                }

                function stick_makeup(standard, side, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];
                  let top_temp = [...standard];
                  let bottom_temp = [...side];

                  standard = [standard[2]];
                  side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                let result_left = judge(left);
                let result_right = judge(right);

                //其中一邊為間隔 result_left || result_right
                if (result_left || result_right) {

                  if (result_left && result_right) {

                    left = no_stick_makeup(left);
                    right = no_stick_makeup(right);
                    fix_rect_angle = left.concat(right)

                  } else if (result_left) {

                    let side = right;
                    fix_rect_angle = no_stick_makeup(left);
                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixRight)

                  } else if (result_right) {

                    let side = left;
                    fix_rect_angle = no_stick_makeup(right);
                    fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixLeft)
                  }

                }

                //左右方的三格都相黏並且為對角 
                if (!result_left && !result_right) {

                  let val_1 = left[1].cntPoint[1].y / right[1].cntPoint[3].y;
                  let val_2 = left[2].cntPoint[1].y / right[0].cntPoint[3].y;

                  if (val_1 < 1.1 && val_1 > 0.9) {
                    fix_rect_angle = stick_makeup(left, right, data.fixRight, data.fixLeft)
                  }

                  if (val_2 < 1.1 && val_2 > 0.9) {
                    fix_rect_angle = stick_makeup(right, left, data.fixLeft, data.fixRight)
                  }

                  console.log(val_1, val_2)
                }

              }

              let three_and_two = function (left, right) {


                function three_rectangle_judge(standard) {

                  let temp_x = 0, temp_y = 0, judge = false;

                  standard.forEach(function (ele) {
                    temp_y += ele.cntInfo.center.y;
                  })

                  let val = (temp_y / 3 / standard[1].cntInfo.center.y).toFixed(3)

                  if (val > 0.995 && val < 1.005)
                    judge = false
                  else
                    judge = true

                  return [judge]

                }

                function two_rectangle_judge(standard) {

                  let splitX = 0, splitY = 0, p1 = 1, p2 = 2;
                  let spacing_big = false, spacing_small = false, spacing_mid = false;
                  for (let i = 0; i < standard.length; i++) {
                    splitX += standard[i]['cntInfo'].center.x;
                    splitY += standard[i]['cntInfo'].center.y;
                  }
                  splitX /= standard.length;
                  splitY /= standard.length;

                  standard.forEach(function (ele) {

                    let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - splitX, 2) + Math.pow(ele.cntInfo.center.y - splitY, 2))
                    let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))
                    let val = distance / length

                    if (val > 1.3 && val < 1.7) {
                      spacing_big = true; spacing_mid = false; spacing_small = false;
                      console.log('spacing_big')
                    }
                    if (val > 0.85 && val < 1.3) {
                      spacing_mid = true; spacing_big = false; spacing_small = false;
                      console.log('spacing_mid')
                    }

                    if (val > 0.4 && val < 0.65) {
                      spacing_small = true; spacing_mid = false; spacing_big = false;
                      console.log('spacing_small')
                    }

                  })


                  return [spacing_big, spacing_mid, spacing_small]

                }

                function three_calc_stick_makeup(standard) {

                  let newPointArr = [...standard];
                  let total_distance = [];
                  let index1, index2;
                  let x = 0, y = 0, cntPoint = [];

                  for (let index = 0; index < standard.length - 1; index++) {
                    let index1 = index;
                    let index2 = index + 1;
                    let distance = Math.sqrt(Math.pow(standard[index1].cntInfo.center.x - standard[index2].cntInfo.center.x, 2)
                      + Math.pow(standard[index1].cntInfo.center.y - standard[index2].cntInfo.center.y, 2))
                    total_distance.push(distance)
                  }

                  if (total_distance[0] < total_distance[1]) {
                    index1 = 1;
                    index2 = 2;
                  } else {
                    index1 = 0;
                    index2 = 1;
                  }

                  let square_1 = {
                    square: standard[index1],
                    idx_1: 2,
                    idx_2: 3
                  }

                  let square_2 = {
                    square: standard[index2],
                    idx_1: 0,
                    idx_2: 1
                  }

                  newPointArr.push(three_rectangle_no_stick_calc(square_1, square_2))

                  newPointArr.sort(function (a, b) {
                    return a.cntInfo.center.y - b.cntInfo.center.y;
                  });

                  return newPointArr

                }

                function two_calc_big_makeup(pointArr, idx1, idx2, idx3, idx4) {

                  let new_array = [...pointArr]

                  let square_1 = {
                    square: pointArr[0],
                    idx_1: 2,
                    idx_2: 3
                  }

                  let square_2 = {
                    square: pointArr[1],
                    idx_1: 1,
                    idx_2: 0
                  }

                  let result = two_rectangle_big_calc(square_1, square_2)

                  new_array.push(result[0])
                  new_array.push(result[1])

                  return new_array;
                }

                function stick_makeup(standard, side, top_temp, bottom_temp, fixdata1, fixdata2) {

                  let x = 0, y = 0, cntPoint = [];

                  // let top_temp = [...standard];
                  // let bottom_temp = [...side];
                  // standard = [standard[1], standard[2]];
                  // side = [side[0]]

                  for (let k = 0; k < standard.length; k++) {

                    x = standard[k].cntPoint[fixdata1[1]].x;
                    y = standard[k].cntPoint[fixdata1[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = standard[k].cntPoint[fixdata1[3]].x;
                    y = standard[k].cntPoint[fixdata1[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[1]].x - 1 * standard[k].cntPoint[fixdata1[0]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[1]].y - 1 * standard[k].cntPoint[fixdata1[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * standard[k].cntPoint[fixdata1[3]].x - 1 * standard[k].cntPoint[fixdata1[2]].x) / (2 - 1)
                    y = (2 * standard[k].cntPoint[fixdata1[3]].y - 1 * standard[k].cntPoint[fixdata1[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    bottom_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  for (let k = 0; k < side.length; k++) {

                    x = side[k].cntPoint[fixdata2[1]].x;
                    y = side[k].cntPoint[fixdata2[1]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = side[k].cntPoint[fixdata2[3]].x;
                    y = side[k].cntPoint[fixdata2[3]].y;
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[1]].x - 1 * side[k].cntPoint[fixdata2[0]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[1]].y - 1 * side[k].cntPoint[fixdata2[0]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    x = (2 * side[k].cntPoint[fixdata2[3]].x - 1 * side[k].cntPoint[fixdata2[2]].x) / (2 - 1)
                    y = (2 * side[k].cntPoint[fixdata2[3]].y - 1 * side[k].cntPoint[fixdata2[2]].y) / (2 - 1)
                    cntPoint.push({ 'x': x, 'y': y })
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                    top_temp.push(calcCntInfo(cntPoint))
                    cntPoint = [];

                  }

                  return top_temp.concat(bottom_temp)
                }

                let left_judge = '', right_judge = ''

                if (left.length == 2) {
                  left_judge = two_rectangle_judge(left)
                } else if (left.length == 3) {
                  left_judge = three_rectangle_judge(left)
                }

                if (right.length == 2) {
                  right_judge = two_rectangle_judge(right)
                } else if (right.length == 3) {
                  right_judge = three_rectangle_judge(right)
                }

                //兩邊或其中一邊滿足條件 left_judge[0] || right_judge[0]
                if (left_judge[0] || right_judge[0]) {

                  if (left_judge[0] && right_judge[0]) {

                    if (left_judge.length < right_judge.length) {

                      left = three_calc_stick_makeup(left)

                      right = two_calc_big_makeup(right, 1, 2, 3, 0)

                    } else {

                      left = two_calc_big_makeup(left, 1, 2, 3, 0)

                      right = three_calc_stick_makeup(right)

                    }

                    fix_rect_angle = left.concat(right)

                    console.log('兩邊都滿足條件 分別可以自補')

                  } else {

                    if (left_judge[0]) {

                      let side = right;
                      if (left_judge.length === 1) {
                        fix_rect_angle = three_calc_stick_makeup(left)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixRight)
                      } else {
                        fix_rect_angle = two_calc_big_makeup(left, 1, 2, 3, 0)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixRight)
                      }

                    } else if (right_judge[0]) {

                      let side = left;
                      if (right_judge.length === 1) {
                        fix_rect_angle = three_calc_stick_makeup(right)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixLeft)
                      } else {
                        fix_rect_angle = two_calc_big_makeup(right, 1, 2, 3, 0)
                        fix_rect_angle = rectangle_calc(fix_rect_angle, side, data.fixLeft)
                      }
                    }

                    console.log('其中一邊滿足條件')
                  }

                } else {

                  if (left_judge.length == 1) {

                    // 左三右二
                    console.log(right_judge)

                    if (right_judge[2]) {

                      let val_1 = left[0].cntPoint[1].y / right[1].cntPoint[0].y
                      let val_2 = left[2].cntPoint[2].y / right[0].cntPoint[3].y

                      console.log(val_1, val_2)

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([left[1], left[2]], [right[0]], left, right, data.fixRight, data.fixLeft)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([left[0], left[1]], [right[1]], left, right, data.fixRight, data.fixLeft)

                      console.log('右2 big to 左3')
                    }

                    if (right_judge[1]) {

                      let val_1 = left[0].cntPoint[1].y / right[0].cntPoint[3].y
                      let val_2 = left[2].cntPoint[2].y / right[1].cntPoint[0].y

                      console.log(val_1, val_2)

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([left[0], left[2]], [right[0]], left, right, data.fixRight, data.fixLeft)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([left[0], left[2]], [right[1]], left, right, data.fixRight, data.fixLeft)

                      console.log('右2 MID to 左3')
                    }

                  }

                  //right_judge.length == 1

                  if (right_judge.length == 1) {

                    // 左二右三

                    if (left_judge[2]) {

                      let val_1 = right[0].cntPoint[0].y / left[1].cntPoint[1].y
                      let val_2 = right[2].cntPoint[0].y / left[0].cntPoint[1].y

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([right[1], right[2]], [left[0]], left, right, data.fixLeft, data.fixRight)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([right[0], right[1]], [left[1]], left, right, data.fixLeft, data.fixRight)

                      console.log('左2 big to 右3')
                    }


                    if (left_judge[1]) {

                      let val_1 = right[0].cntPoint[0].y / left[0].cntPoint[2].y
                      let val_2 = right[2].cntPoint[3].y / left[1].cntPoint[1].y

                      if (val_1 < 1.1 && val_1 > 0.9)
                        fix_rect_angle = stick_makeup([right[0], right[2]], [left[0]], left, right, data.fixLeft, data.fixRight)

                      if (val_2 < 1.1 && val_2 > 0.9)
                        fix_rect_angle = stick_makeup([right[0], right[2]], [left[1]], left, right, data.fixLeft, data.fixRight)

                      console.log('左2 mid to 右3')
                    }

                  }

                }

              }

              let judge_filter = dict[left.length][right.length];

              if (judge_filter == '22')
                two_and_two(left, right)

              if (judge_filter == '33')
                three_and_three(left, right)

              if (judge_filter == '32' || judge_filter == '23')
                three_and_two(left, right)


              if (fix_rect_angle.length) {
                return fix_rect_angle
              } else {

                left = A8_sheet_makeup(left, 0, 0)
                right = A8_sheet_makeup(right, 0, 0)
                fix_rect_angle = left.concat(right)
                console.log('沒有矩形可以參考!!!!!')
                return fix_rect_angle
              }


            }


            let split_rectangle = split_judge_rectangle(rectangle_point)


            switch (split_rectangle[0]) {
              case 'f0':

                rectangle_result = rectangle_point.slice(0);
                break;
              case 'f2':

                rectangle_result = f2_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              case 'f1':
                rectangle_result = f1_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              case 'f3':

                rectangle_result = f3_extends_rectangle(split_rectangle[1], split_rectangle[2])
                break;
              default:
              //console.log('null');
            }

            if (rectangle_result.length) {
              return AllSortRectangleV2(rectangle_result)
            }

            return rectangle_point
          }

          const res = horizon ? test(rectangle_point, resultX, resultY) : test2(rectangle_point, resultX, resultY)

          return res
        }

        let A8_sheet = function (A8_sheet_point, resultX, resultY) {
          let pointArr = A8_sheet_point;
          let horizon = false;

          for (let k = 0; k < pointArr.length; k++) {
            const element = pointArr[k].cntInfo.angle;
            horizon = element < 50 ? false : true;
          }

          let horizonCalc = function () {

            //分流
            let shunt = function () {
              let ret = [];

              for (let e = 0; e < pointArr.length - 1; e++) {

                const element1 = pointArr[e];
                const element2 = pointArr[e + 1];

                let ddd = Math.pow(element2.cntInfo.center.x - element1.cntInfo.center.x, 2) +
                  Math.pow(element2.cntInfo.center.y - element1.cntInfo.center.y, 2)

                ddd = Math.sqrt(ddd)
                ret.push(ddd)

              }

              const map1 = ret.map(x => (x / 200).toFixed(0));

              let lock = 0;

              for (let t = 0; t < map1.length; t++) {
                const element = map1[t];
                if (element != "1") {
                  lock = 1;
                  break;
                }

              }


              return lock

            }

            //所有點不同水平
            //分割成兩塊做補正
            //再做延伸
            let calculateRect = function (pointArr) {

              console.log('一般計算')

              let splitAll = [];

              //將矩形分割成上下部分

              let lineM = (pointArr[0]['cntPoint'][1].y - pointArr[0]['cntPoint'][0].y) /
                (pointArr[0]['cntPoint'][1].x - pointArr[0]['cntPoint'][0].x)

              let y2 = resultY - (lineM * resultX)

              let split_Top = pointArr.filter(ele => ele.cntInfo.center.x * lineM - ele.cntInfo.center.y + y2 > 0);
              let split_Bottom = pointArr.filter(ele => ele.cntInfo.center.x * lineM - ele.cntInfo.center.y + y2 < 0);

              splitAll.push(split_Top);
              splitAll.push(split_Bottom);

              let calculate1 = function (splitAll) {

                console.log('一般計算 補正')

                let calcTotal = [], resultOftop = [], resultOfbottom = []

                for (let j = 0; j < splitAll.length; j++) {

                  let splitX = 0, splitY = 0;
                  for (let i = 0; i < splitAll[j].length; i++) {
                    splitX += splitAll[j][i]['cntInfo'].center.x;
                    splitY += splitAll[j][i]['cntInfo'].center.y;
                  }
                  splitX /= splitAll[j].length;
                  splitY /= splitAll[j].length;

                  cv.circle(drawDst, new cv.Point(splitX, splitY), 8, new cv.Scalar(255, 255, 0), 4, cv.LINE_AA, 0);

                  let temp = A8_sheet_makeup(splitAll[j], splitX, splitY);

                  j === 0 ? resultOftop = temp : resultOfbottom = temp;

                }

                // console.log(resultOftop.length, resultOfbottom.length)

                let calcFourAndOneRect = function (top, bottom) {

                  let data = {
                    'fixBottom': [0, 3, 1, 2],
                    'fixTop': [3, 0, 2, 1]
                  }

                  let topAddBottom = (standard, center, fixdata) => {

                    let x, y, cntPoint = [];

                    for (let k = 0; k < standard.length; k++) {

                      let valx = (center[0].cntPoint[fixdata[0]].x / standard[k].cntPoint[fixdata[1]].x).toFixed(3)
                      let valy = (center[0].cntPoint[fixdata[0]].y / standard[k].cntPoint[fixdata[1]].y).toFixed(3)


                      if (((1.1 > valx && valx > 0.9) && (1.1 > valy && valy > 0.9)) == false) {
                        x = standard[k].cntPoint[fixdata[1]].x;
                        y = standard[k].cntPoint[fixdata[1]].y;
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = standard[k].cntPoint[fixdata[3]].x;
                        y = standard[k].cntPoint[fixdata[3]].y;
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                        y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                        y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })

                        center.push(calcCntInfo(cntPoint));
                        cntPoint = [];
                      }

                    }

                    const total = standard.concat(center);

                    return total;
                  };

                  const result = (top.length > bottom.length) ? topAddBottom(top, bottom, data.fixBottom) : topAddBottom(bottom, top, data.fixTop);

                  return result
                }


                //console.log(resultOftop.length, resultOfbottom.length)

                if (!(resultOftop.length == 4 && resultOfbottom.length == 4)) {

                  console.log('一般計算 補正 互相補正')
                  calcTotal = calcFourAndOneRect(resultOftop, resultOfbottom)
                } else {

                  console.log('一般計算 補正 普通補正')

                  function error_rect_fix() {

                    let bottom_line = { 'p1': 3, 'p2': 2 }
                    let top_line = { 'p1': 0, 'p2': 1 }

                    let ret1 = [], ret2 = [];
                    let check = 0;

                    for (let k = 0; k < 4; k++) {

                      const e1 = resultOftop[k].cntPoint[bottom_line.p1]
                      const e2 = resultOftop[k].cntPoint[bottom_line.p2]
                      const e3 = resultOfbottom[k].cntPoint[top_line.p1]
                      const e4 = resultOfbottom[k].cntPoint[top_line.p2]
                      const v1 = e1.x
                      const v2 = e2.x
                      const v3 = e3.x
                      const v4 = e4.x
                      ret1.push({ 'val1': v1, 'val2': v2 })
                      ret2.push({ 'val1': v3, 'val2': v4 })

                    }

                    for (let k = 0; k < 4; k++) {
                      const element1 = ret1[k];

                      for (let j = 0; j < 4; j++) {
                        const element2 = ret2[j];
                        let v1 = (element1.val1 / element2.val1).toFixed(3)
                        let v2 = (element1.val2 / element2.val2).toFixed(3)
                        if ((v1 > 0.95 && v1 < 1.05) && (v2 > 0.95 && v2 < 1.05)) {
                          check += 1;

                        }
                      }

                    }

                    if (check == 3 || check == 2) {

                      console.log('=====================修正=====================')

                      //將乾淨的矩形重算
                      let splitX = 0, splitY = 0;
                      let reset_top_calc = function () {
                        for (let i = 0; i < resultOftop.length; i++) {
                          splitX += resultOftop[i]['cntInfo'].center.x;
                          splitY += resultOftop[i]['cntInfo'].center.y;
                        }
                        splitX /= resultOftop.length;
                        splitY /= resultOftop.length;
                      }

                      let reset_bottom_calc = function () {
                        for (let i = 0; i < resultOfbottom.length; i++) {
                          splitX += resultOfbottom[i]['cntInfo'].center.x;
                          splitY += resultOfbottom[i]['cntInfo'].center.y;
                        }
                        splitX /= resultOfbottom.length;
                        splitY /= resultOfbottom.length;
                      }

                      let tempWidth = videoWidth;
                      let tempHeight = videoHeight;
                      if (degree == 90 || degree == 270) {
                        tempWidth = videoHeight;
                        tempHeight = videoWidth;
                      }

                      console.log(tempWidth / 2, resultX)

                      if (ret2[0].val1 > ret1[0].val1 && ret2[3].val1 > ret1[3].val1) {
                        if (resultX > tempWidth / 2) {

                          //左邊的要剔除
                          if (check == 3) {
                            resultOftop.shift();
                            reset_top_calc();

                            let temp = A8_sheet_makeup(resultOftop, splitX, splitY, "right");
                            resultOftop = temp;

                          } else if (check == 2) {

                            resultOftop.shift(); resultOftop.shift();
                            reset_top_calc();

                            let temp = A8_sheet_makeup(resultOftop, splitX, splitY, "right");
                            resultOftop = temp;
                          }


                          console.log('上面向右移動')
                        } else {

                          //右邊的要剔除
                          if (check == 3) {

                            resultOfbottom.pop();
                            reset_bottom_calc();
                            let temp = A8_sheet_makeup(resultOfbottom, splitX, splitY, "left");
                            resultOfbottom = temp;

                          } else if (check == 2) {

                            resultOfbottom.pop(); resultOfbottom.pop();
                            reset_bottom_calc();

                            let temp = A8_sheet_makeup(resultOfbottom, splitX, splitY, "left");
                            resultOfbottom = temp;
                          }


                          console.log('下面向左移動')
                        }

                      } else {
                        if (resultX < tempWidth / 2) {


                          //右邊的要剔除
                          if (check == 3) {

                            resultOftop.pop();
                            reset_top_calc();
                            let temp = A8_sheet_makeup(resultOftop, splitX, splitY, "left");
                            resultOftop = temp;

                          } else if (check == 2) {

                            resultOftop.pop(); resultOftop.pop();
                            reset_top_calc();

                            let temp = A8_sheet_makeup(resultOftop, splitX, splitY, "left");
                            resultOftop = temp;
                          }


                          console.log('上面向左移動')
                        } else {


                          //左邊的要剔除
                          if (check == 3) {
                            resultOfbottom.shift();
                            reset_bottom_calc();

                            let temp = A8_sheet_makeup(resultOfbottom, splitX, splitY, "right");
                            resultOfbottom = temp;

                          } else if (check == 2) {

                            resultOfbottom.shift(); resultOfbottom.shift();
                            reset_bottom_calc();

                            let temp = A8_sheet_makeup(resultOfbottom, splitX, splitY, "right");
                            resultOfbottom = temp;
                          }

                          console.log('下面向右移動')
                        }

                      }


                    }


                    calcTotal = resultOftop.concat(resultOfbottom)

                    console.log('=====================修正=====================')
                  }

                  error_rect_fix()
                }

                return calcTotal;
              }

              let calculate2 = function () {


                console.log('一般計算 不做補正')
                return pointArr
              }

              let resultArr = (split_Top.length == 1 && split_Bottom.length == 1) ? calculate2() : calculate1(splitAll);

              const total = resultArr

              return total
            }

            //所有點同一水平
            //從同一水平的點做補正
            //再做延伸
            let horizontalExtend = function (pointArr) {

              console.log('上下計算')

              let splitX = 0, splitY = 0;

              for (let i = 0; i < pointArr.length; i++) {
                splitX += pointArr[i]['cntInfo'].center.x;
                splitY += pointArr[i]['cntInfo'].center.y;
              }

              splitX /= pointArr.length;
              splitY /= pointArr.length;

              //如果單側小於4個則先做補正
              pointArr = pointArr.length < 4 ? A8_sheet_makeup(pointArr, splitX, splitY) : pointArr;

              const data = {
                'fixBottom': [0, 3, 1, 2], 'fixTop': [3, 0, 2, 1]
              }

              let calc = function (data) {

                let x, y, cntPoint = [];
                let resultArr = [...pointArr];

                for (let k = 0; k < pointArr.length; k++) {

                  x = pointArr[k].cntPoint[data[1]].x;
                  y = pointArr[k].cntPoint[data[1]].y;
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = pointArr[k].cntPoint[data[3]].x;
                  y = pointArr[k].cntPoint[data[3]].y;
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = (2 * pointArr[k].cntPoint[data[1]].x - 1 * pointArr[k].cntPoint[data[0]].x) / (2 - 1)
                  y = (2 * pointArr[k].cntPoint[data[1]].y - 1 * pointArr[k].cntPoint[data[0]].y) / (2 - 1)
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = (2 * pointArr[k].cntPoint[data[3]].x - 1 * pointArr[k].cntPoint[data[2]].x) / (2 - 1)
                  y = (2 * pointArr[k].cntPoint[data[3]].y - 1 * pointArr[k].cntPoint[data[2]].y) / (2 - 1)
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  resultArr.push(calcCntInfo(cntPoint));
                  cntPoint = [];

                }

                resultArr.sort(function (a, b) {
                  return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                });

                const res = AllSortRectangleV2(resultArr, drawDst, 0)

                return res
              }

              const total = (pointArr.length != 1) ? (splitY < videoHeight / 2) ? calc(data.fixBottom) : calc(data.fixTop) : pointArr

              return total
            }

            const shuntJudge = shunt()

            const res = shuntJudge ? calculateRect(pointArr) : horizontalExtend(pointArr);

            return res;
          }

          let verticalCalc = function () {

            //分流
            let shunt = function () {
              let ret = [];

              for (let e = 0; e < pointArr.length - 1; e++) {

                const element1 = pointArr[e];
                const element2 = pointArr[e + 1];

                let ddd = Math.pow(element2.cntInfo.center.x - element1.cntInfo.center.x, 2) +
                  Math.pow(element2.cntInfo.center.y - element1.cntInfo.center.y, 2)

                ddd = Math.sqrt(ddd)
                ret.push(ddd)

              }

              const map1 = ret.map(x => (x / 200).toFixed(0));

              let lock = 0;

              for (let t = 0; t < map1.length; t++) {
                const element = map1[t];
                if (element != "1") {
                  lock = 1;
                  break;
                }

              }


              return lock

            }

            //所有點同一垂直
            //從同一垂直的點做補正
            //再做延伸
            let verticalExtend = function (pointArr) {

              console.log('垂直計算')
              let splitX = 0, splitY = 0;

              for (let i = 0; i < pointArr.length; i++) {
                splitX += pointArr[i]['cntInfo'].center.x;
                splitY += pointArr[i]['cntInfo'].center.y;
              }

              splitX /= pointArr.length;
              splitY /= pointArr.length;

              pointArr = pointArr.length < 4 ? A8_sheet_makeup(pointArr, splitX, splitY) : pointArr;


              let data = {
                'fixRight': [0, 1, 3, 2], 'fixLeft': [1, 0, 2, 3]
              }

              let calc = function (data) {

                let x, y, cntPoint = [];
                let resultArr = [...pointArr];
                let tmpa = [];

                for (let k = 0; k < pointArr.length; k++) {

                  x = pointArr[k].cntPoint[data[1]].x;
                  y = pointArr[k].cntPoint[data[1]].y;
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = pointArr[k].cntPoint[data[3]].x;
                  y = pointArr[k].cntPoint[data[3]].y;
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = (2 * pointArr[k].cntPoint[data[1]].x - 1 * pointArr[k].cntPoint[data[0]].x) / (2 - 1)
                  y = (2 * pointArr[k].cntPoint[data[1]].y - 1 * pointArr[k].cntPoint[data[0]].y) / (2 - 1)
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  x = (2 * pointArr[k].cntPoint[data[3]].x - 1 * pointArr[k].cntPoint[data[2]].x) / (2 - 1)
                  y = (2 * pointArr[k].cntPoint[data[3]].y - 1 * pointArr[k].cntPoint[data[2]].y) / (2 - 1)
                  cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)

                  tmpa.push(calcCntInfo(cntPoint))
                  resultArr.push(calcCntInfo(cntPoint));
                  cntPoint = [];
                }

                tmpa.sort(function (a, b) {
                  return a.cntInfo.boundingRect.y - b.cntInfo.boundingRect.y
                });


                return resultArr
              }

              const total = (pointArr.length != 1) ? (splitX < videoWidth / 2) ? calc(data.fixRight) : calc(data.fixLeft) : pointArr

              return total
            }

            //所有點不同垂直
            //分割成兩塊做補正
            //再做延伸
            let calculateRect = function (pointArr) {

              let splitAll = [];

              //將舉行分割成左右部分
              let dxdy =
                (pointArr[0]['cntPoint'][1].x - pointArr[0]['cntPoint'][2].x) /
                (pointArr[0]['cntPoint'][1].y - pointArr[0]['cntPoint'][2].y)

              let d = resultY * 2 * dxdy / 2;

              let x1 = new cv.Point(resultX + d, resultY * 2);
              let x2 = new cv.Point(resultX - d, 0);

              let split_Left = pointArr.filter(function (ele) {

                let c = {
                  'x': ele.cntInfo.center.x,
                  'y': ele.cntInfo.center.y
                }
                let val = ((x2.x - x1.x) * (c.y - x1.y) - (x2.y - x1.y) * (c.x - x1.x)).toFixed(0)

                return val < 0
              })

              let split_Right = pointArr.filter(function (ele) {

                let c = {
                  'x': ele.cntInfo.center.x,
                  'y': ele.cntInfo.center.y
                }
                let val = ((x2.x - x1.x) * (c.y - x1.y) - (x2.y - x1.y) * (c.x - x1.x)).toFixed(0)

                return val > 0
              })

              splitAll.push(split_Left);
              splitAll.push(split_Right);

              let calculate1 = function (splitAll) {

                console.log('一般計算 補正')

                let calcTotal = [], resultOfLeft = [], resultOfRight = []

                for (let j = 0; j < splitAll.length; j++) {

                  let splitX = 0, splitY = 0;
                  for (let i = 0; i < splitAll[j].length; i++) {
                    splitX += splitAll[j][i]['cntInfo'].center.x;
                    splitY += splitAll[j][i]['cntInfo'].center.y;
                  }
                  splitX /= splitAll[j].length;
                  splitY /= splitAll[j].length;

                  cv.circle(drawDst, new cv.Point(splitX, splitY), 8, new cv.Scalar(255, 255, 0), 4, cv.LINE_AA, 0);

                  if (j === 0)
                    resultOfLeft = A8_sheet_makeup(splitAll[j], splitX, splitY);

                  if (j === 1)
                    resultOfRight = A8_sheet_makeup(splitAll[j], splitX, splitY);

                }

                let calcFourAndOneRect = function (left, right) {

                  let data = {
                    'fixRight': [0, 1, 3, 2],
                    'fixLeft': [1, 0, 2, 3]
                  }

                  let leftAddRight = (standard, center, fixdata) => {

                    let x, y, cntPoint = [];
                    console.log(standard.length)
                    console.log(center.length)

                    for (let k = 0; k < standard.length; k++) {

                      let valx = (center[0].cntPoint[fixdata[0]].x / standard[k].cntPoint[fixdata[1]].x).toFixed(3)
                      let valy = (center[0].cntPoint[fixdata[0]].y / standard[k].cntPoint[fixdata[1]].y).toFixed(3)

                      console.log(valx, valy)

                      if (((1.1 > valx && valx > 0.9) && (1.1 > valy && valy > 0.9)) == false) {

                        x = standard[k].cntPoint[fixdata[1]].x;
                        y = standard[k].cntPoint[fixdata[1]].y;
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = standard[k].cntPoint[fixdata[3]].x;
                        y = standard[k].cntPoint[fixdata[3]].y;
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = (2 * standard[k].cntPoint[fixdata[1]].x - 1 * standard[k].cntPoint[fixdata[0]].x) / (2 - 1)
                        y = (2 * standard[k].cntPoint[fixdata[1]].y - 1 * standard[k].cntPoint[fixdata[0]].y) / (2 - 1)
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })
                        x = (2 * standard[k].cntPoint[fixdata[3]].x - 1 * standard[k].cntPoint[fixdata[2]].x) / (2 - 1)
                        y = (2 * standard[k].cntPoint[fixdata[3]].y - 1 * standard[k].cntPoint[fixdata[2]].y) / (2 - 1)
                        cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                        cntPoint.push({ 'x': x, 'y': y })

                        center.push(calcCntInfo(cntPoint));
                        cntPoint = [];

                      }

                    }

                    const total = standard.concat(center);

                    return total;
                  };

                  const result = (left.length > right.length) ? leftAddRight(left, right, data.fixRight) : leftAddRight(right, left, data.fixLeft);

                  return result

                }




                if (!(resultOfLeft.length == 4 && resultOfRight.length == 4)) {

                  console.log('一般計算 補正 互相補正')

                  calcTotal = calcFourAndOneRect(resultOfLeft, resultOfRight)
                } else {

                  function error_rect_fix() {

                    let right_line = { 'p1': 1, 'p2': 2 }
                    let left_line = { 'p1': 0, 'p2': 3 }

                    let ret1 = [], ret2 = [];
                    let check = 0;

                    for (let k = 0; k < 4; k++) {

                      const e1 = resultOfLeft[k].cntPoint[right_line.p1]
                      const e2 = resultOfLeft[k].cntPoint[right_line.p2]
                      const e3 = resultOfRight[k].cntPoint[left_line.p1]
                      const e4 = resultOfRight[k].cntPoint[left_line.p2]
                      const v1 = e1.y
                      const v2 = e2.y
                      const v3 = e3.y
                      const v4 = e4.y
                      ret1.push({ 'val1': v1, 'val2': v2 })
                      ret2.push({ 'val1': v3, 'val2': v4 })

                    }

                    for (let k = 0; k < 4; k++) {
                      const element1 = ret1[k];

                      for (let j = 0; j < 4; j++) {
                        const element2 = ret2[j];
                        let v1 = (element1.val1 / element2.val1).toFixed(3)
                        let v2 = (element1.val2 / element2.val2).toFixed(3)
                        if ((v1 > 0.95 && v1 < 1.05) && (v2 > 0.95 && v2 < 1.05)) {
                          check += 1;

                        }
                      }

                    }

                    if (check == 3 || check == 2) {
                      let splitX = 0, splitY = 0;
                      let reset_right_calc = function () {
                        for (let i = 0; i < resultOfRight.length; i++) {
                          splitX += resultOfRight[i]['cntInfo'].center.x;
                          splitY += resultOfRight[i]['cntInfo'].center.y;
                        }
                        splitX /= resultOfRight.length;
                        splitY /= resultOfRight.length;
                      }

                      let reset_left_calc = function () {
                        for (let i = 0; i < resultOfLeft.length; i++) {
                          splitX += resultOfLeft[i]['cntInfo'].center.x;
                          splitY += resultOfLeft[i]['cntInfo'].center.y;
                        }
                        splitX /= resultOfLeft.length;
                        splitY /= resultOfLeft.length;
                      }

                      let tempWidth = videoWidth
                      let tempHeight = videoHeight
                      if (degree == 90 || degree == 270) {
                        tempWidth = videoHeight;
                        tempHeight = videoWidth;
                      }

                      if (ret2[0].val1 < ret1[0].val1 && ret2[3].val1 < ret1[3].val1) {

                        if (resultY > tempHeight / 2) {

                          console.log(check)
                          if (check == 3)
                            resultOfRight.shift();
                          else if (check == 2) {
                            resultOfRight.shift(); resultOfRight.shift();
                          }
                          reset_right_calc();
                          let temp = A8_sheet_makeup(resultOfRight, splitX, splitY, 'bottom');
                          resultOfRight = temp;

                          console.log('右邊向下移動')
                        } else {


                          if (check == 3)
                            resultOfLeft.pop();
                          else if (check == 2) {
                            resultOfLeft.pop(); resultOfLeft.pop();
                          }
                          reset_left_calc();

                          let temp = A8_sheet_makeup(resultOfLeft, splitX, splitY, "top");
                          resultOfLeft = temp;

                          console.log('左邊向上移動')
                        }


                        console.log('左下 右上')
                      } else {

                        if (resultY < tempHeight / 2) {
                          if (check == 3)
                            resultOfRight.pop();
                          else if (check == 2) {
                            resultOfRight.pop(); resultOfRight.pop();
                          }
                          reset_right_calc();
                          let temp = A8_sheet_makeup(resultOfRight, splitX, splitY, 'top');
                          resultOfRight = temp;


                          console.log('右邊向上移動')
                        } else {

                          if (check == 3)
                            resultOfLeft.shift();
                          else if (check == 2) {
                            resultOfLeft.shift(); resultOfLeft.shift();
                          }

                          reset_left_calc();
                          let temp = A8_sheet_makeup(resultOfLeft, splitX, splitY, "bottom");
                          resultOfLeft = temp;

                          console.log('左邊向下移動')
                        }


                        console.log('右下 左上')
                      }


                    }

                    console.log('垂直 一般計算 補正 普通補正')
                    calcTotal = resultOfLeft.concat(resultOfRight)
                  }

                  error_rect_fix();

                }

                return calcTotal;
              }

              let calculate2 = function () {

                console.log('一般計算 不做補正')
                return pointArr
              }

              let total = (split_Left.length == 1 && split_Right.length == 1) ? calculate2() : calculate1(splitAll);

              return total
            }

            const copyArr = [...pointArr];

            const res = shunt() ? calculateRect(copyArr) : verticalExtend(copyArr)

            return res
          }

          const resultArrayPoint = horizon ? horizonCalc() : verticalCalc()

          return AllSortRectangleV2(resultArrayPoint, drawDst, 0);
        }

        let A8_sheet_makeup = function (A8_sheet_makeup_point, resultX, resultY, check) {
          let pointArr = A8_sheet_makeup_point
          let resultNum = pointArr.length;
          let horizontal = false;
          let range = 10;
          let circle_range = 7, circle_thickness = 7, circle_color = new cv.Scalar(200, 0, 0, 255);

          if (resultX == 0 && resultY == 0) {
            for (let i = 0; i < A8_sheet_makeup_point.length; i++) {
              resultX += A8_sheet_makeup_point[i]['cntInfo'].center.x;
              resultY += A8_sheet_makeup_point[i]['cntInfo'].center.y;
            }
            resultX /= A8_sheet_makeup_point.length;
            resultY /= A8_sheet_makeup_point.length;
          }

          pointArr.sort(function (a, b) {
            return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
          });

          //判斷垂直或是水平
          for (let k = 0; k < pointArr.length; k++) {

            const element = pointArr[k].cntInfo.angle;

            if (typeof element !== "undefined") {

              horizontal = element < 50 ? false : true;

            }
          }

          let OneRectangle = function () {

            let newPointArr = [...pointArr];
            let centerLack = false;
            let centerLackValue = 0;
            let totaldistance = [];
            var LackOneCenter = {};

            //判斷是否在中間
            for (let index = 0; index < pointArr.length - 1; index++) {
              let index1 = index;
              let index2 = index + 1;
              let distance = Math.sqrt(Math.pow(pointArr[index1].cntInfo.center.x - pointArr[index2].cntInfo.center.x, 2)
                + Math.pow(pointArr[index1].cntInfo.center.y - pointArr[index2].cntInfo.center.y, 2))

              totaldistance.push(distance)
            }

            if (totaldistance[0] / totaldistance[1] > 1.7 || totaldistance[0] / totaldistance[1] < 0.6) {
              centerLack = true;
              centerLackValue = totaldistance[0] / totaldistance[1];
            }

            let LackRectangle = function (index1, index2, idx0, idx1, idx2, idx3) {

              this.index1 = index1;
              this.idx0 = idx0;
              this.idx1 = idx1;

              this.index2 = index2;
              this.idx2 = idx2;
              this.idx3 = idx3;

              this.cntPointArr = [];
              this.cntPoint = [];

              let x, y;

              this.calcSideRectangle = function () {

                x = pointArr[this.index1].cntPoint[this.idx1].x
                y = pointArr[this.index1].cntPoint[this.idx1].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index1].cntPoint[this.idx3].x
                y = pointArr[this.index1].cntPoint[this.idx3].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (2 * pointArr[this.index1].cntPoint[this.idx1].x - 1 * pointArr[this.index1].cntPoint[this.idx0].x) / 1
                y = (2 * pointArr[this.index1].cntPoint[this.idx1].y - 1 * pointArr[this.index1].cntPoint[this.idx0].y) / 1
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (2 * pointArr[this.index1].cntPoint[this.idx3].x - 1 * pointArr[this.index1].cntPoint[this.idx2].x) / 1
                y = (2 * pointArr[this.index1].cntPoint[this.idx3].y - 1 * pointArr[this.index1].cntPoint[this.idx2].y) / 1
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })


              }

              this.calcCenterRectangle = function () {

                x = pointArr[this.index1].cntPoint[this.idx0].x
                y = pointArr[this.index1].cntPoint[this.idx0].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index1].cntPoint[this.idx1].x
                y = pointArr[this.index1].cntPoint[this.idx1].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index2].cntPoint[this.idx2].x
                y = pointArr[this.index2].cntPoint[this.idx2].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index2].cntPoint[this.idx3].x
                y = pointArr[this.index2].cntPoint[this.idx3].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

              }

            }

            //缺失  補正中間
            //反之  補正旁邊
            if (centerLack) {

              if (horizontal) {
                if (centerLackValue > 1) {
                  LackOneCenter = new LackRectangle(0, 1, 1, 2, 0, 3);
                  //console.log('centerlack 水平 0 1')
                } else {
                  LackOneCenter = new LackRectangle(1, 2, 1, 2, 0, 3);
                  //console.log('centerlack 水平 1 2')
                }
              } else {

                if (centerLackValue > 1) {
                  LackOneCenter = new LackRectangle(0, 1, 2, 3, 0, 1);
                  //console.log('centerlack 垂直 0 1')
                } else {
                  LackOneCenter = new LackRectangle(1, 2, 2, 3, 0, 1);
                  //console.log('centerlack 垂直 1 2')
                }
              }


              LackOneCenter.calcCenterRectangle();


            } else {
              if (horizontal) {
                if (degree == 0 || degree == 180) {

                  if (resultX < videoWidth / 2) {

                    if (check == "left") {
                      LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                      console.log('錯了 要補左邊')
                    } else {
                      LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                      console.log('正確 要補右邊')
                    }


                  } else if (resultX > videoWidth / 2) {

                    if (check == "right") {
                      LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                      console.log('錯了 要補右邊')
                      //要補右邊
                    } else {
                      LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                      console.log('正確 要補左邊')
                      //console.log('水平 補左邊')
                    }

                  }

                } else if (degree == 90 || degree == 270) {

                  if (resultX < videoHeight / 2) {

                    LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    console.log('正確 要補右邊')
                    // if (check == "left") {
                    // 	LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    // 	console.log('錯了 要補左邊')
                    // } else if (check !== 'right') {
                    // 	LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    // 	console.log('正確 要補右邊')
                    // } else {
                    // 	LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    // 	console.log('正確 要補右邊')
                    // }


                  } else if (resultX > videoHeight / 2) {

                    // if (check == "right") {
                    // 	LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    // 	console.log('錯了 要補右邊')
                    // 	//要補右邊
                    // } else if (check !== 'left') {
                    // 	LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    // 	console.log('正確 要補左邊')
                    // 	//console.log('水平 補左邊')
                    // } else {
                    // 	LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    // 	console.log('正確 要補左邊')

                    // }

                    LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    console.log('正確 要補左邊')

                  }

                }

              } else {

                if (degree == 0 || degree == 180) {

                  console.log(check)
                  if (resultY < videoHeight / 2) {

                    if (check == 'top') {
                      LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                      console.log('錯誤 垂直 補上邊')

                    } else if (check !== 'bottom') {

                      LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                      console.log('正確 垂直 補下邊')
                    } else {

                      LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                      console.log('正確 垂直 補下邊')
                    }

                    //LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                    //console.log('正確 垂直 補下邊')
                  } else if (resultY > videoHeight / 2) {

                    if (check == 'bottom') {
                      LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                      console.log('錯誤 垂直 補下邊')

                    } else if (check !== 'top') {

                      LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                      console.log('正確 垂直 補上邊')
                    } else {
                      LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                      console.log('正確 垂直 補上邊')
                    }

                    // LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);

                    // console.log('正確 垂直 補上邊')
                  }

                } else if (degree == 90 || degree == 270) {

                  console.log(videoWidth, check)
                  if (resultY < videoWidth / 2) {

                    if (check == 'top') {

                      LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                      console.log('錯誤 垂直 補上邊')
                    } else {

                      LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                      console.log('正確 垂直 補下邊')
                    }


                  } else if (resultY > videoWidth / 2) {

                    if (check == 'bottom') {

                      LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                      console.log('錯誤 垂直 補下邊')
                    } else {
                      LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                      console.log('正確 垂直 補上邊')
                    }


                  }

                }

              }
              LackOneCenter.calcSideRectangle()

            }

            newPointArr.push(calcCntInfo(LackOneCenter.cntPoint));
            newPointArr.sort(function (a, b) {
              return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
            });
            pointArr = AllSortRectangleV2(newPointArr, drawDst)

          }

          let TwoRectangle = function () {

            let newPointArr = [...pointArr];
            let tiedSticky = false;
            let intervalBig = false;
            let intervalSmall = false;

            let LackTwoRect = function () {

              let x, y;

              this.cntPoint = [];
              this.cntPointArr = [];
              this.side = '';
              this.sideIndex = '';

              this.intervalBigCalc = function (idx1, idx2, idx3, idx4) {

                // 0 1 2 3
                // 1 2 3 0

                x = (pointArr[1].cntPoint[idx1].x)
                y = (pointArr[1].cntPoint[idx1].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[1].cntPoint[idx4].x)
                y = (pointArr[1].cntPoint[idx4].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx1].x + pointArr[1].cntPoint[idx2].x) / 2
                y = (pointArr[0].cntPoint[idx1].y + pointArr[1].cntPoint[idx2].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x + pointArr[1].cntPoint[idx4].x) / 2
                y = (pointArr[0].cntPoint[idx3].y + pointArr[1].cntPoint[idx4].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

                x = (pointArr[0].cntPoint[idx2].x)
                y = (pointArr[0].cntPoint[idx2].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x)
                y = (pointArr[0].cntPoint[idx3].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx1].x + pointArr[1].cntPoint[idx2].x) / 2
                y = (pointArr[0].cntPoint[idx1].y + pointArr[1].cntPoint[idx2].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x + pointArr[1].cntPoint[idx4].x) / 2
                y = (pointArr[0].cntPoint[idx3].y + pointArr[1].cntPoint[idx4].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

              }

              this.intervalSmallCalc = function () {

                let firstIndex = 0;
                let secondIndex = 1;
                let fIdx0, fIdx1, sIdx0, sIdx1;
                let p1, p2, p3, p4;
                let x, y;
                let m = 2, n = 1;

                if (this.side == 'right' || this.side == 'left') {

                  fIdx0 = 1;
                  fIdx1 = 2;
                  sIdx0 = 0;
                  sIdx1 = 3;
                  // 0 -> 1 2
                  // 1 -> 0 3

                  if (this.sideIndex) {
                    //0 1 3 2 
                    p1 = 0, p2 = 1, p3 = 3, p4 = 2;
                  } else {
                    //1 0 2 3
                    p1 = 1, p2 = 0, p3 = 2, p4 = 3;
                  }

                } else if (this.side == 'top' || this.side == 'bottom') {

                  fIdx0 = 2;
                  fIdx1 = 3;
                  sIdx0 = 0;
                  sIdx1 = 1;
                  // 0 -> 2 3
                  // 1 -> 0 1
                  if (this.sideIndex) {
                    //1 2 0 3
                    p1 = 1, p2 = 2, p3 = 0, p4 = 3;
                  } else {
                    //2 1 3 0
                    p1 = 2, p2 = 1, p3 = 3, p4 = 0;
                  }

                }

                x = (pointArr[firstIndex].cntPoint[fIdx0].x)
                y = (pointArr[firstIndex].cntPoint[fIdx0].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[firstIndex].cntPoint[fIdx1].x)
                y = (pointArr[firstIndex].cntPoint[fIdx1].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[secondIndex].cntPoint[sIdx0].x)
                y = (pointArr[secondIndex].cntPoint[sIdx0].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[secondIndex].cntPoint[sIdx1].x)
                y = (pointArr[secondIndex].cntPoint[sIdx1].y)
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

                x = pointArr[this.sideIndex].cntPoint[p2].x
                y = pointArr[this.sideIndex].cntPoint[p2].y
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                x = pointArr[this.sideIndex].cntPoint[p4].x
                y = pointArr[this.sideIndex].cntPoint[p4].y
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                x = (m * pointArr[this.sideIndex].cntPoint[p2].x - n * pointArr[this.sideIndex].cntPoint[p1].x) / (m - n)
                y = (m * pointArr[this.sideIndex].cntPoint[p2].y - n * pointArr[this.sideIndex].cntPoint[p1].y) / (m - n)
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                x = (m * pointArr[this.sideIndex].cntPoint[p4].x - n * pointArr[this.sideIndex].cntPoint[p3].x) / (m - n)
                y = (m * pointArr[this.sideIndex].cntPoint[p4].y - n * pointArr[this.sideIndex].cntPoint[p3].y) / (m - n)
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];



              }

              this.intervalTiedStickyCalc = function (diect, index0, index1) {


                if (diect == 'center') {

                  let m = 2, n = 1;
                  let index = index0[0];
                  let p1 = index0[1], p2 = index0[2], p3 = index0[3], p4 = index0[4];

                  x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p2].x)
                  y = (pointArr[index].cntPoint[p2].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p4].x)
                  y = (pointArr[index].cntPoint[p4].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  this.cntPointArr.push(this.cntPoint)
                  this.cntPoint = [];

                  index = index1[0];
                  p1 = index1[1], p2 = index1[2], p3 = index1[3], p4 = index1[4];
                  // 0 1 3 2
                  x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p2].x)
                  y = (pointArr[index].cntPoint[p2].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p4].x)
                  y = (pointArr[index].cntPoint[p4].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                  this.cntPointArr.push(this.cntPoint)
                  this.cntPoint = [];

                } else if (diect == 'right' || diect == 'left' || diect == 'top' || diect == 'bottom') {

                  let p1 = index0[1], p2 = index0[2], p3 = index0[3], p4 = index0[4];
                  let index = index0[0];

                  for (let f = 3; f > 1; f--) {

                    let m = f, n = f - 1;


                    x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                    y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);
                    this.cntPoint.push({ 'x': x, 'y': y })

                    x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                    y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                    cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);

                    this.cntPoint.push({ 'x': x, 'y': y })



                    if (f == 2) {
                      this.cntPointArr.push(this.cntPoint)
                      this.cntPoint = []

                      x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                      y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);


                      x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                      y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);

                      x = pointArr[index].cntPoint[p2].x
                      y = pointArr[index].cntPoint[p2].y
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);


                      x = pointArr[index].cntPoint[p4].x
                      y = pointArr[index].cntPoint[p4].y
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0);

                      this.cntPointArr.push(this.cntPoint)
                      this.cntPoint = []

                    }
                  }
                }
              }
            }

            let filterClass = function () {

              let p1, p2;

              if (horizontal) {
                p1 = 0;
                p2 = 1;
              } else {
                p1 = 1;
                p2 = 2;
              }

              pointArr.forEach(function (ele, idx) {

                let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - resultX, 2) + Math.pow(ele.cntInfo.center.y - resultY, 2))
                let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))

                if ((distance / length) > 1.45) {
                  intervalBig = true;
                } else if ((distance / length) > 0.95) {
                  // console.log('intervalSmall')
                  intervalSmall = true
                } else if ((distance / length) > 0.45) {
                  // console.log('tiedSticky')
                  tiedSticky = true
                }

              });


            }

            let run = function () {

              let twoLack = new LackTwoRect();

              console.log(intervalBig, intervalSmall, tiedSticky)
              if (intervalBig) {

                if (horizontal) {
                  twoLack.intervalBigCalc(0, 1, 2, 3)
                } else {
                  twoLack.intervalBigCalc(1, 2, 3, 0)
                }

                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));
                newPointArr.sort(function (a, b) {
                  return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                });
                pointArr = AllSortRectangleV2(newPointArr, drawDst)


              } else if (intervalSmall) {

                if (horizontal) {
                  if (degree == 0 || degree == 180) {

                    if (resultX < videoWidth / 2) {

                      twoLack.side = 'right'
                      twoLack.sideIndex = 1;
                      console.log('水平 補右邊')
                    } else if (resultX > videoWidth / 2) {


                      twoLack.side = 'left'
                      twoLack.sideIndex = 0;
                      console.log('水平 補左邊')
                    }

                  } else if (degree == 90 || degree == 270) {

                    if (resultX < videoHeight / 2) {

                      twoLack.side = 'right'
                      twoLack.sideIndex = 1;
                      //console.log('水平 補右邊')
                    } else if (resultX > videoHeight / 2) {


                      twoLack.side = 'left'
                      twoLack.sideIndex = 0;
                      //console.log('水平 補左邊')
                    }

                  }

                } else {

                  if (degree == 0 || degree == 180) {

                    if (resultY < videoHeight / 2) {

                      twoLack.side = 'bottom';
                      twoLack.sideIndex = 1;
                      //console.log('垂直 補下邊')
                    } else if (resultY > videoHeight / 2) {


                      twoLack.side = 'top';
                      twoLack.sideIndex = 0;
                      //console.log('垂直 補上邊')
                    }

                  } else if (degree == 90 || degree == 270) {

                    if (resultY < videoWidth / 2) {

                      twoLack.side = 'bottom';
                      twoLack.sideIndex = 1;
                      //console.log('垂直 補下邊')

                    } else if (resultY > videoWidth / 2) {

                      twoLack.side = 'top';
                      twoLack.sideIndex = 0;
                      //console.log('垂直 補上邊')
                    }

                  }

                }

                twoLack.intervalSmallCalc();
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));
                newPointArr.sort(function (a, b) {
                  return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                });
                pointArr = AllSortRectangleV2(newPointArr, drawDst)

              } else if (tiedSticky) {

                let x1;
                let x2;
                let z1;
                let z2;

                if (degree == 90 || degree == 270) {

                  let tmpw = videoHeight
                  let tmph = videoWidth
                  x1 = tmpw / 2 - 100;
                  x2 = tmph / 2 - 100;
                  z1 = tmpw / 2 + 100;
                  z2 = tmph / 2 + 100;

                } else {

                  x1 = videoWidth / 2 - 100;
                  x2 = videoHeight / 2 - 100;
                  z1 = videoWidth / 2 + 100;
                  z2 = videoHeight / 2 + 100;
                }

                if (resultX > x1 && resultX < z1 && resultY > x2 && resultY < z2) {

                  if (horizontal) {

                    let index0 = [0, 1, 0, 2, 3];
                    let index1 = [1, 0, 1, 3, 2];
                    twoLack.intervalTiedStickyCalc('center', index0, index1);
                    // 0 -> 1 0
                    // 0 -> 2 3
                    // 1 -> 0 1
                    // 1 -> 3 2

                  } else {

                    let index0 = [0, 2, 1, 3, 0];
                    let index1 = [1, 0, 3, 1, 2];
                    twoLack.intervalTiedStickyCalc('center', index0, index1);
                    // 0 -> 2 1
                    // 0 -> 3 0
                    // 1 -> 0 3
                    // 1 -> 1 2

                  }

                } else {

                  if (horizontal) {


                    if (resultX < x1) {

                      if (check == 'left') {
                        let index0 = [0, 1, 0, 2, 3];
                        twoLack.intervalTiedStickyCalc('left', index0, null);
                      } else {
                        let index0 = [1, 0, 1, 3, 2];
                        twoLack.intervalTiedStickyCalc('right', index0, null);
                      }

                      console.log('h:' + check)

                    } else if (resultX > z1) {

                      if (check == 'right') {
                        let index0 = [1, 0, 1, 3, 2];
                        twoLack.intervalTiedStickyCalc('right', index0, null);
                      } else {

                        let index0 = [0, 1, 0, 2, 3];
                        twoLack.intervalTiedStickyCalc('left', index0, null);
                      }

                      console.log('h:' + check)

                    } else {

                      let index0 = [0, 1, 0, 2, 3];
                      let index1 = [1, 0, 1, 3, 2];
                      twoLack.intervalTiedStickyCalc('center', index0, index1);
                      console.log('h:center')

                    }

                  } else {


                    if (resultY > z2) {

                      if (check == "bottom") {

                        let index0 = [1, 1, 2, 0, 3];
                        twoLack.intervalTiedStickyCalc('bottom', index0, null);
                      } else {

                        let index0 = [0, 2, 1, 3, 0];
                        twoLack.intervalTiedStickyCalc('top', index0, null);
                      }

                      console.log('v:' + check)
                    } else if (resultY < x2) {

                      if (check == "top") {

                        let index0 = [0, 2, 1, 3, 0];
                        twoLack.intervalTiedStickyCalc('top', index0, null);
                      } else {

                        let index0 = [1, 1, 2, 0, 3];
                        twoLack.intervalTiedStickyCalc('bottom', index0, null);
                      }
                      console.log('v:' + check)

                    } else {

                      let index0 = [0, 2, 1, 3, 0];
                      let index1 = [1, 0, 3, 1, 2];
                      twoLack.intervalTiedStickyCalc('center', index0, index1);
                      console.log('v:center')
                    }
                  }
                }

                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));
                newPointArr.sort(function (a, b) {
                  return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                });
                pointArr = AllSortRectangleV2(newPointArr, drawDst)


              }

            }

            filterClass();

            run();
          }

          if (resultNum === 3) {
            OneRectangle();
          } else if (resultNum === 2) {
            TwoRectangle();
          }

          return pointArr
        }

        let B4_sheet = function (pointArr, resultX, resultY, screen_rect_info) {

          let resultNum = pointArr.length;
          let horizontal = screen_rect_info.horizontal

          let circle_range = 7, circle_thickness = 7, circle_color = new cv.Scalar(200, 0, 0, 255);

          let OneRectangle = function () {

            let newPointArr = [...pointArr];
            let centerLack = false;
            let centerLackValue = 0;
            let totaldistance = [];
            var LackOneCenter = {};

            //判斷是否在中間
            for (let index = 0; index < pointArr.length - 1; index++) {
              let index1 = index;
              let index2 = index + 1;
              let distance = Math.sqrt(Math.pow(pointArr[index1].cntInfo.center.x - pointArr[index2].cntInfo.center.x, 2)
                + Math.pow(pointArr[index1].cntInfo.center.y - pointArr[index2].cntInfo.center.y, 2))

              totaldistance.push(distance)
            }
            if (totaldistance[0] / totaldistance[1] > 1.9 || totaldistance[0] / totaldistance[1] < 0.6) {
              centerLack = true;
              centerLackValue = totaldistance[0] / totaldistance[1];
            }

            let LackRectangle = function (index1, index2, idx0, idx1, idx2, idx3) {

              this.index1 = index1;
              this.idx0 = idx0;
              this.idx1 = idx1;

              this.index2 = index2;
              this.idx2 = idx2;
              this.idx3 = idx3;

              this.cntPointArr = [];
              this.cntPoint = [];

              let x, y;

              this.calcSideRectangle = function () {

                x = pointArr[this.index1].cntPoint[this.idx1].x
                y = pointArr[this.index1].cntPoint[this.idx1].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index1].cntPoint[this.idx3].x
                y = pointArr[this.index1].cntPoint[this.idx3].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (2 * pointArr[this.index1].cntPoint[this.idx1].x - 1 * pointArr[this.index1].cntPoint[this.idx0].x) / 1
                y = (2 * pointArr[this.index1].cntPoint[this.idx1].y - 1 * pointArr[this.index1].cntPoint[this.idx0].y) / 1
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (2 * pointArr[this.index1].cntPoint[this.idx3].x - 1 * pointArr[this.index1].cntPoint[this.idx2].x) / 1
                y = (2 * pointArr[this.index1].cntPoint[this.idx3].y - 1 * pointArr[this.index1].cntPoint[this.idx2].y) / 1
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })


              }

              this.calcCenterRectangle = function () {

                x = pointArr[this.index1].cntPoint[this.idx0].x
                y = pointArr[this.index1].cntPoint[this.idx0].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index1].cntPoint[this.idx1].x
                y = pointArr[this.index1].cntPoint[this.idx1].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index2].cntPoint[this.idx2].x
                y = pointArr[this.index2].cntPoint[this.idx2].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = pointArr[this.index2].cntPoint[this.idx3].x
                y = pointArr[this.index2].cntPoint[this.idx3].y
                cv.circle(drawDst, new cv.Point(x, y), circle_range, circle_color, circle_thickness, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

              }

            }

            //缺失  補正中間
            //反之  補正旁邊
            if (centerLack) {

              if (horizontal) {
                if (centerLackValue > 1) {
                  LackOneCenter = new LackRectangle(0, 1, 1, 2, 0, 3);
                  //console.log('centerlack 水平 0 1')
                } else {
                  LackOneCenter = new LackRectangle(1, 2, 1, 2, 0, 3);
                  //console.log('centerlack 水平 1 2')
                }
              } else {

                if (centerLackValue > 1) {
                  LackOneCenter = new LackRectangle(0, 1, 2, 3, 0, 1);
                  //console.log('centerlack 垂直 0 1')
                } else {
                  LackOneCenter = new LackRectangle(1, 2, 2, 3, 0, 1);
                  //console.log('centerlack 垂直 1 2')
                }
              }


              LackOneCenter.calcCenterRectangle();


            } else {


              if (horizontal) {
                if (degree == 0 || degree == 180) {

                  if (resultX < videoWidth / 2) {
                    LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    console.log('水平 補右邊')
                  } else if (resultX > videoWidth / 2) {
                    LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    console.log('水平 補左邊')
                  }

                } else if (degree == 90 || degree == 270) {

                  if (resultX < videoHeight / 2) {
                    LackOneCenter = new LackRectangle(2, null, 0, 1, 3, 2);
                    console.log('水平 補右邊')
                  } else if (resultX > videoHeight / 2) {
                    LackOneCenter = new LackRectangle(0, null, 1, 0, 2, 3);
                    console.log('水平 補左邊')
                  }

                }

              } else {

                if (degree == 0 || degree == 180) {

                  if (resultY < videoHeight / 2) {
                    LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                    console.log('垂直 補下邊')
                  } else if (resultY > videoHeight / 2) {
                    LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                    console.log('垂直 補上邊')
                  }

                } else if (degree == 90 || degree == 270) {

                  if (resultY < videoWidth / 2) {
                    LackOneCenter = new LackRectangle(2, null, 1, 2, 0, 3);
                    console.log('垂直 補下邊')
                  } else if (resultY > videoWidth / 2) {
                    LackOneCenter = new LackRectangle(0, null, 2, 1, 3, 0);
                    console.log('垂直 補上邊')
                  }

                }

              }
              console.log(LackOneCenter)
              LackOneCenter.calcSideRectangle()

            }

            newPointArr.push(calcCntInfo(LackOneCenter.cntPoint));
            newPointArr.sort(function (a, b) {
              return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
            });
            pointArr = AllSortRectangleV2(newPointArr, drawDst)

          }

          let TwoRectangle = function () {

            let newPointArr = [...pointArr];
            let tiedSticky = false;
            let intervalBig = false;
            let intervalSmall = false;

            let LackTwoRect = function () {

              let x, y;

              this.cntPoint = [];
              this.cntPointArr = [];
              this.side = '';
              this.sideIndex = '';

              this.intervalBigCalc = function (idx1, idx2, idx3, idx4) {

                // 0 1 2 3
                // 1 2 3 0
                x = (pointArr[1].cntPoint[idx1].x)
                y = (pointArr[1].cntPoint[idx1].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[1].cntPoint[idx4].x)
                y = (pointArr[1].cntPoint[idx4].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx1].x + pointArr[1].cntPoint[idx2].x) / 2
                y = (pointArr[0].cntPoint[idx1].y + pointArr[1].cntPoint[idx2].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x + pointArr[1].cntPoint[idx4].x) / 2
                y = (pointArr[0].cntPoint[idx3].y + pointArr[1].cntPoint[idx4].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

                x = (pointArr[0].cntPoint[idx2].x)
                y = (pointArr[0].cntPoint[idx2].y)
                cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x)
                y = (pointArr[0].cntPoint[idx3].y)
                cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx1].x + pointArr[1].cntPoint[idx2].x) / 2
                y = (pointArr[0].cntPoint[idx1].y + pointArr[1].cntPoint[idx2].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[0].cntPoint[idx3].x + pointArr[1].cntPoint[idx4].x) / 2
                y = (pointArr[0].cntPoint[idx3].y + pointArr[1].cntPoint[idx4].y) / 2
                cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })

                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

              }

              this.intervalSmallCalc = function () {

                let firstIndex = 0;
                let secondIndex = 1;
                let fIdx0, fIdx1, sIdx0, sIdx1;
                let p1, p2, p3, p4;
                let x, y;
                let m = 2, n = 1;

                if (this.side == 'right' || this.side == 'left') {

                  fIdx0 = 1;
                  fIdx1 = 2;
                  sIdx0 = 0;
                  sIdx1 = 3;
                  // 0 -> 1 2
                  // 1 -> 0 3

                  if (this.sideIndex) {
                    //0 1 3 2 
                    p1 = 0, p2 = 1, p3 = 3, p4 = 2;
                  } else {
                    //1 0 2 3
                    p1 = 1, p2 = 0, p3 = 2, p4 = 3;
                  }

                } else if (this.side == 'top' || this.side == 'bottom') {

                  fIdx0 = 2;
                  fIdx1 = 3;
                  sIdx0 = 0;
                  sIdx1 = 1;
                  // 0 -> 2 3
                  // 1 -> 0 1
                  if (this.sideIndex) {
                    //1 2 0 3
                    p1 = 1, p2 = 2, p3 = 0, p4 = 3;
                  } else {
                    //2 1 3 0
                    p1 = 2, p2 = 1, p3 = 3, p4 = 0;
                  }

                }

                x = (pointArr[firstIndex].cntPoint[fIdx0].x)
                y = (pointArr[firstIndex].cntPoint[fIdx0].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[firstIndex].cntPoint[fIdx1].x)
                y = (pointArr[firstIndex].cntPoint[fIdx1].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[secondIndex].cntPoint[sIdx0].x)
                y = (pointArr[secondIndex].cntPoint[sIdx0].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                x = (pointArr[secondIndex].cntPoint[sIdx1].x)
                y = (pointArr[secondIndex].cntPoint[sIdx1].y)
                cv.circle(drawDst, new cv.Point(x, y), 25, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPoint.push({ 'x': x, 'y': y })
                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];

                x = pointArr[this.sideIndex].cntPoint[p2].x
                y = pointArr[this.sideIndex].cntPoint[p2].y
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                x = pointArr[this.sideIndex].cntPoint[p4].x
                y = pointArr[this.sideIndex].cntPoint[p4].y
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                x = (m * pointArr[this.sideIndex].cntPoint[p2].x - n * pointArr[this.sideIndex].cntPoint[p1].x) / (m - n)
                y = (m * pointArr[this.sideIndex].cntPoint[p2].y - n * pointArr[this.sideIndex].cntPoint[p1].y) / (m - n)
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                x = (m * pointArr[this.sideIndex].cntPoint[p4].x - n * pointArr[this.sideIndex].cntPoint[p3].x) / (m - n)
                y = (m * pointArr[this.sideIndex].cntPoint[p4].y - n * pointArr[this.sideIndex].cntPoint[p3].y) / (m - n)
                this.cntPoint.push({ 'x': x, 'y': y })
                cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                this.cntPointArr.push(this.cntPoint)
                this.cntPoint = [];



              }

              this.intervalTiedStickyCalc = function (diect, index0, index1) {


                if (diect == 'center') {

                  let m = 2, n = 1;
                  let index = index0[0];
                  let p1 = index0[1], p2 = index0[2], p3 = index0[3], p4 = index0[4];

                  x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p2].x)
                  y = (pointArr[index].cntPoint[p2].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p4].x)
                  y = (pointArr[index].cntPoint[p4].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  this.cntPointArr.push(this.cntPoint)
                  this.cntPoint = [];

                  index = index1[0];
                  p1 = index1[1], p2 = index1[2], p3 = index1[3], p4 = index1[4];
                  // 0 1 3 2
                  x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                  y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p2].x)
                  y = (pointArr[index].cntPoint[p2].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  x = (pointArr[index].cntPoint[p4].x)
                  y = (pointArr[index].cntPoint[p4].y)
                  this.cntPoint.push({ 'x': x, 'y': y })
                  cv.circle(drawDst, new cv.Point(x, y), 10, new cv.Scalar(255, 255, 0), 1, cv.LINE_AA, 0)
                  this.cntPointArr.push(this.cntPoint)
                  this.cntPoint = [];

                } else if (diect == 'right' || diect == 'left' || diect == 'top' || diect == 'bottom') {

                  let p1 = index0[1], p2 = index0[2], p3 = index0[3], p4 = index0[4];
                  let index = index0[0];

                  for (let f = 3; f > 1; f--) {

                    let m = f, n = f - 1;


                    x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                    y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                    cv.circle(drawDst, new cv.Point(x, y), 30, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);
                    this.cntPoint.push({ 'x': x, 'y': y })

                    x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                    y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                    cv.circle(drawDst, new cv.Point(x, y), 30, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);

                    this.cntPoint.push({ 'x': x, 'y': y })



                    if (f == 2) {
                      this.cntPointArr.push(this.cntPoint)
                      this.cntPoint = []

                      x = (m * pointArr[index].cntPoint[p2].x - n * pointArr[index].cntPoint[p1].x) / (m - n)
                      y = (m * pointArr[index].cntPoint[p2].y - n * pointArr[index].cntPoint[p1].y) / (m - n)
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);

                      x = (m * pointArr[index].cntPoint[p4].x - n * pointArr[index].cntPoint[p3].x) / (m - n)
                      y = (m * pointArr[index].cntPoint[p4].y - n * pointArr[index].cntPoint[p3].y) / (m - n)
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);

                      x = pointArr[index].cntPoint[p2].x
                      y = pointArr[index].cntPoint[p2].y
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);


                      x = pointArr[index].cntPoint[p4].x
                      y = pointArr[index].cntPoint[p4].y
                      this.cntPoint.push({ 'x': x, 'y': y })
                      cv.circle(drawDst, new cv.Point(x, y), 20, new cv.Scalar(255, 255, 0), 2, cv.LINE_AA, 0);

                      this.cntPointArr.push(this.cntPoint)
                      this.cntPoint = []

                    }
                  }
                }
              }
            }

            let filterClass = function () {

              let p1, p2;

              if (horizontal) {
                p1 = 0;
                p2 = 1;
              } else {
                p1 = 1;
                p2 = 2;
              }

              //console.log(horizontal, p1, p2)

              pointArr.forEach(function (ele, idx) {

                let distance = Math.sqrt(Math.pow(ele.cntInfo.center.x - resultX, 2) + Math.pow(ele.cntInfo.center.y - resultY, 2))
                let length = Math.sqrt(Math.pow(ele.cntPoint[p1].x - ele.cntPoint[p2].x, 2) + Math.pow(ele.cntPoint[p1].y - ele.cntPoint[p2].y, 2))


                cv.circle(drawDst, new cv.Point(ele.cntPoint[p1].x, ele.cntPoint[p1].y), 10, new cv.Scalar(255, 255, 255), 6, cv.LINE_AA, 0);
                cv.circle(drawDst, new cv.Point(ele.cntPoint[p2].x, ele.cntPoint[p2].y), 10, new cv.Scalar(255, 255, 255), 6, cv.LINE_AA, 0);


                if ((distance / length) > 1.45) {
                  //console.log('intervalBig')
                  intervalBig = true;
                } else if ((distance / length) > 0.95) {
                  //console.log('intervalSmall')
                  intervalSmall = true
                } else if ((distance / length) > 0.45) {
                  //console.log('tiedSticky')
                  tiedSticky = true
                }

              });


            }

            let run = function () {


              let twoLack = new LackTwoRect();

              if (intervalBig) {

                if (horizontal) {
                  twoLack.intervalBigCalc(0, 1, 2, 3)
                } else {
                  twoLack.intervalBigCalc(1, 2, 3, 0)
                }

                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));

                pointArr = AllSortRectangleV2(newPointArr, drawDst)


              } else if (intervalSmall) {

                if (horizontal) {
                  if (degree == 0 || degree == 180) {

                    if (resultX < videoWidth / 2) {

                      twoLack.side = 'right'
                      twoLack.sideIndex = 1;
                      console.log('紙張水平 畫面水平 補右邊')
                    } else if (resultX > videoWidth / 2) {


                      twoLack.side = 'left'
                      twoLack.sideIndex = 0;
                      console.log('紙張水平 畫面水平 補左邊')
                    }

                  } else if (degree == 90 || degree == 270) {

                    if (resultY < videoHeight / 2) {

                      twoLack.side = 'right'
                      twoLack.sideIndex = 1;
                      console.log('紙張水平 畫面垂直 補右邊')
                    } else if (resultY > videoHeight / 2) {


                      twoLack.side = 'left'
                      twoLack.sideIndex = 0;
                      console.log('紙張水平 畫面垂直 補左邊')
                    }

                  }

                } else {

                  if (degree == 0 || degree == 180) {

                    if (resultY < videoHeight / 2) {

                      twoLack.side = 'bottom';
                      twoLack.sideIndex = 1;
                      console.log('紙張垂直 畫面水平 補下邊')
                    } else if (resultY > videoHeight / 2) {


                      twoLack.side = 'top';
                      twoLack.sideIndex = 0;
                      console.log('紙張垂直 畫面水平 補上邊')
                    }

                  } else if (degree == 90 || degree == 270) {

                    if (resultY < videoWidth / 2) {

                      twoLack.side = 'bottom';
                      twoLack.sideIndex = 1;
                      console.log('紙張垂直 畫面垂直 補下邊')

                    } else if (resultY > videoWidth / 2) {

                      twoLack.side = 'top';
                      twoLack.sideIndex = 0;
                      console.log('紙張垂直 畫面垂直 補上邊')
                    }

                  }

                }

                console.log(twoLack.side, twoLack.sideIndex)

                twoLack.intervalSmallCalc();
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));

                pointArr = AllSortRectangleV2(newPointArr, drawDst)

              } else if (tiedSticky) {

                let x1;
                let x2;
                let z1;
                let z2;

                if (degree == 90 || degree == 270) {

                  let tmpw = videoHeight
                  let tmph = videoWidth
                  x1 = tmpw / 2 - 100;
                  x2 = tmph / 2 - 100;
                  z1 = tmpw / 2 + 100;
                  z2 = tmph / 2 + 100;

                } else {

                  x1 = videoWidth / 2 - 100;
                  x2 = videoHeight / 2 - 100;
                  z1 = videoWidth / 2 + 100;
                  z2 = videoHeight / 2 + 100;
                }


                if (resultX > x1 && resultX < z1 && resultY > x2 && resultY < z2) {

                  if (horizontal) {

                    let index0 = [0, 1, 0, 2, 3];
                    let index1 = [1, 0, 1, 3, 2];
                    twoLack.intervalTiedStickyCalc('center', index0, index1);
                    // 0 -> 1 0
                    // 0 -> 2 3
                    // 1 -> 0 1
                    // 1 -> 3 2

                  } else {

                    let index0 = [0, 2, 1, 3, 0];
                    let index1 = [1, 0, 3, 1, 2];
                    twoLack.intervalTiedStickyCalc('center', index0, index1);
                    // 0 -> 2 1
                    // 0 -> 3 0
                    // 1 -> 0 3
                    // 1 -> 1 2

                  }

                } else {

                  if (horizontal) {

                    if (resultX < x1) {

                      let index0 = [1, 0, 1, 3, 2];
                      twoLack.intervalTiedStickyCalc('right', index0, null);
                      console.log('hr')
                    } else if (resultX > z1) {

                      let index0 = [0, 1, 0, 2, 3];
                      twoLack.intervalTiedStickyCalc('left', index0, null);
                      console.log('hl')
                    } else {

                      let index0 = [0, 1, 0, 2, 3];
                      let index1 = [1, 0, 1, 3, 2];
                      twoLack.intervalTiedStickyCalc('center', index0, index1);
                      console.log('hc')
                    }

                  } else {

                    if (resultY > z2) {

                      let index0 = [0, 2, 1, 3, 0];
                      twoLack.intervalTiedStickyCalc('top', index0, null);
                      console.log('vt')
                    } else if (resultY < x2) {

                      console.log('vb')
                      let index0 = [1, 1, 2, 0, 3];
                      twoLack.intervalTiedStickyCalc('bottom', index0, null);
                    } else {

                      let index0 = [0, 2, 1, 3, 0];
                      let index1 = [1, 0, 3, 1, 2];
                      twoLack.intervalTiedStickyCalc('center', index0, index1);
                      console.log('vc')
                    }
                  }
                }

                newPointArr.push(calcCntInfo(twoLack.cntPointArr[0]));
                newPointArr.push(calcCntInfo(twoLack.cntPointArr[1]));

                pointArr = AllSortRectangleV2(newPointArr, drawDst)

              }

            }


            filterClass();

            run();


          }

          if (resultNum === 3) {

            OneRectangle();

          } else if (resultNum === 2) {

            TwoRectangle();

          }

          return pointArr
        }

        let A4_sheet = function (A4_sheet_point, resultX, resultY) {
          let pointArr = A4_sheet_point
          let quadrant = [1, 2, 3, 4];
          let Horizontal = false;
          let vertical = false;
          let missRight = false;
          let missLeft = false;
          let missTop = false;
          let missBottom = false;

          //計算有的的象限 判斷缺失象限
          if (pointArr.length == 3) {

            for (let j = 0; j < pointArr.length; j++) {
              let x = pointArr[j].cntInfo.center.x
              let y = pointArr[j].cntInfo.center.y

              if (x < resultX && y < resultY) {
                let index = quadrant.indexOf(2);
                quadrant.splice(index, 1);
                //console.log("2象限")
              } else if (x > resultX && y < resultY) {
                let index = quadrant.indexOf(1);
                quadrant.splice(index, 1);
                //console.log("1象限")
              } else if (x < resultX && y > resultY) {
                let index = quadrant.indexOf(3);
                quadrant.splice(index, 1);
                //console.log("3象限")
              } else if (x > resultX && y > resultY) {
                let index = quadrant.indexOf(4);
                quadrant.splice(index, 1);
                //console.log("4象限")
              }
            }
          } else if (pointArr.length == 2) {

            for (let j = 0; j < pointArr.length; j++) {
              let x = pointArr[j].cntInfo.center.x
              let y = pointArr[j].cntInfo.center.y
              let tmp_x_1 = resultX + 75;
              let tmp_x_2 = resultX - 75;
              let tmp_y_1 = resultY + 75;
              let tmp_y_2 = resultY - 75;
              if (tmp_x_1 > x && tmp_x_2 < x) {
                console.log('垂直')
                //缺右側 反之 缺左側
                if (resultX < videoWidth / 2) {
                  missRight = true
                } else {
                  missLeft = true
                }
                Horizontal = true
              } else if (tmp_y_1 > y && tmp_y_2 < y) {
                console.log('水平')
                //缺上側 反之 缺下側
                if (resultY < videoHeight / 2) {
                  missBottom = true
                } else {
                  missTop = true
                }
                vertical = true;
              } else {
                if (x < resultX && y < resultY) {
                  let index = quadrant.indexOf(2);
                  quadrant.splice(index, 1);
                  console.log("2象限")
                } else if (x > resultX && y < resultY) {
                  let index = quadrant.indexOf(1);
                  quadrant.splice(index, 1);
                  console.log("1象限")
                } else if (x < resultX && y > resultY) {
                  let index = quadrant.indexOf(3);
                  quadrant.splice(index, 1);
                  console.log("3象限")
                } else if (x > resultX && y > resultY) {
                  let index = quadrant.indexOf(4);
                  quadrant.splice(index, 1);
                  console.log("4象限")
                }
              }
            }
          }

          //計算對角點
          let p1, p2, p3, p4, a1, b1, c1, a2, b2, c2, det;
          let Intersection = function () {
            a1 = p2.y - p1.y;
            b1 = p1.x - p2.x;
            c1 = p1.x * p2.y - p2.x * p1.y;
            a2 = p4.y - p3.y;
            b2 = p3.x - p4.x;
            c2 = p3.x * p4.y - p4.x * p3.y;
            det = a1 * b2 - a2 * b1;
          }

          //得出缺失的象限 缺一個 或是 缺兩個(對角) 進行補正
          if (quadrant.length == 1) {

            let newPointArr = [...pointArr];
            let missQuadrant = quadrant[0];
            let finalArray = [];
            let cntPoint = [];
            let cntPush = function (index) {

              cntPoint.push({ 'x': pointArr[0].cntPoint[index].x, 'y': pointArr[0].cntPoint[index].y })
              cntPoint.push({ 'x': pointArr[1].cntPoint[index].x, 'y': pointArr[1].cntPoint[index].y })
              cntPoint.push({ 'x': pointArr[2].cntPoint[index].x, 'y': pointArr[2].cntPoint[index].y })

            }

            switch (missQuadrant) {
              case 1:

                if (missQuadrant == 1)
                  cntPush(1)

                p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                p2 = { 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y }
                p3 = { 'x': pointArr[2].cntPoint[1].x, 'y': pointArr[2].cntPoint[1].y }
                p4 = { 'x': pointArr[2].cntPoint[2].x, 'y': pointArr[2].cntPoint[2].y }
                Intersection();

                break;

              case 2:

                if (missQuadrant == 2)
                  cntPush(0)


                pointArr.sort(function (a, b) {

                  let X1 = 0;
                  let Y1 = videoHeight;

                  let aX2 = a.cntInfo.center.x
                  let aY2 = a.cntInfo.center.y;
                  let lineHeighta = Math.sqrt(((aX2 - X1) * (aX2 - X1)) + ((aY2 - Y1) * (aY2 - Y1)))

                  let bX2 = b.cntInfo.center.x
                  let bY2 = b.cntInfo.center.y;
                  let lineHeightb = Math.sqrt(((bX2 - X1) * (bX2 - X1)) + ((bY2 - Y1) * (bY2 - Y1)))

                  return lineHeighta - lineHeightb;

                });

                p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                p2 = { 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y }
                p3 = { 'x': pointArr[2].cntPoint[0].x, 'y': pointArr[2].cntPoint[0].y }
                p4 = { 'x': pointArr[2].cntPoint[1].x, 'y': pointArr[2].cntPoint[1].y }


                Intersection();

                break;
              case 3:

                if (missQuadrant == 3)
                  cntPush(3)

                p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                p2 = { 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y }
                p3 = { 'x': pointArr[2].cntPoint[2].x, 'y': pointArr[2].cntPoint[2].y }
                p4 = { 'x': pointArr[2].cntPoint[3].x, 'y': pointArr[2].cntPoint[3].y }
                Intersection();


                break;
              case 4:

                if (missQuadrant == 4)
                  cntPush(2)

                p1 = { 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y }
                p2 = { 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y }
                p3 = { 'x': pointArr[2].cntPoint[3].x, 'y': pointArr[2].cntPoint[3].y }
                p4 = { 'x': pointArr[2].cntPoint[2].x, 'y': pointArr[2].cntPoint[2].y }
                Intersection();

                break;
            }


            cntPoint.push({ 'x': (c1 * b2 - c2 * b1) / det, 'y': (a1 * c2 - a2 * c1) / det })
            //計算缺失象限
            finalArray = calcCntInfo(cntPoint)
            newPointArr.push(finalArray)

            newPointArr.sort(function (a, b) {
              return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
            });

            pointArr = newPointArr

          } else if (quadrant.length == 2) {
            let cntPoint = [];

            if (pointArr[0].cntInfo.center.x > pointArr[1].cntInfo.center.x) {
              let temp = pointArr[0]
              pointArr[0] = pointArr[1]
              pointArr[1] = temp
            }

            let newPointArr = [...pointArr];
            let finalArray = [];

            console.log(newPointArr)
            //對角
            if (!(Horizontal) && !(vertical)) {

              let diagonal = function () {

                if (quadrant[0] == 1 && quadrant[1] == 3) {
                  //計算第3象限
                  cntPoint.push({ 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y })
                  cntPoint.push({ 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y })
                  cntPoint.push({ 'x': pointArr[1].cntPoint[3].x, 'y': pointArr[1].cntPoint[3].y })
                  p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                  p2 = { 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y }
                  p3 = { 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y }
                  p4 = { 'x': pointArr[1].cntPoint[3].x, 'y': pointArr[1].cntPoint[3].y }
                  Intersection();
                  cntPoint.push({ 'x': (c1 * b2 - c2 * b1) / det, 'y': (a1 * c2 - a2 * c1) / det })

                  finalArray = calcCntInfo(cntPoint, 4)
                  newPointArr.push(finalArray)

                  finalArray = []
                  cntPoint = []

                  //計算第1象限
                  cntPoint.push({ 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y })
                  cntPoint.push({ 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y })
                  cntPoint.push({ 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y })
                  p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                  p2 = { 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y }
                  p3 = { 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y }
                  p4 = { 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y }
                  Intersection();
                  cntPoint.push({ 'x': (c1 * b2 - c2 * b1) / det, 'y': (a1 * c2 - a2 * c1) / det })

                  finalArray = calcCntInfo(cntPoint, 3)
                  newPointArr.push(finalArray)
                  console.log(newPointArr)
                  newPointArr.sort(function (a, b) {
                    return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                  });

                } else if (quadrant[0] == 2 && quadrant[1] == 4) {

                  //計算第2象限
                  p1 = { 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y }
                  p2 = { 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y }
                  p3 = { 'x': pointArr[1].cntPoint[0].x, 'y': pointArr[1].cntPoint[0].y }
                  p4 = { 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y }
                  Intersection();
                  cntPoint.push({ 'x': (c1 * b2 - c2 * b1) / det, 'y': (a1 * c2 - a2 * c1) / det })

                  cntPoint.push({ 'x': pointArr[1].cntPoint[0].x, 'y': pointArr[1].cntPoint[0].y })
                  cntPoint.push({ 'x': pointArr[1].cntPoint[3].x, 'y': pointArr[1].cntPoint[3].y })
                  cntPoint.push({ 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y })

                  finalArray = calcCntInfo(cntPoint, 4)
                  newPointArr.push(finalArray)

                  finalArray = []
                  cntPoint = []

                  //計算第4象限
                  cntPoint.push({ 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y })
                  cntPoint.push({ 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y })

                  p1 = { 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y }
                  p2 = { 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y }
                  p3 = { 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y }
                  p4 = { 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y }
                  Intersection();
                  cntPoint.push({ 'x': (c1 * b2 - c2 * b1) / det, 'y': (a1 * c2 - a2 * c1) / det })

                  cntPoint.push({ 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y })

                  finalArray = calcCntInfo(cntPoint, 3)
                  newPointArr.push(finalArray)
                  console.log(newPointArr)
                  newPointArr.sort(function (a, b) {
                    return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
                  });

                }
              }

              diagonal()


            }

            pointArr = newPointArr

          }

          //得出缺失的象限 垂直 進行補正
          if (Horizontal) {

            let cntPoint = [];
            let newPointArr = [...pointArr];
            let finalArray = [];

            if (missRight) {

              //計算第1象限
              for (let index = 0; index < pointArr[0].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y })
                  let p1 = 2 * pointArr[0].cntPoint[1].x - 1 * pointArr[0].cntPoint[0].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[1].y - 1 * pointArr[0].cntPoint[0].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y })
                  let p1 = 2 * pointArr[0].cntPoint[2].x - 1 * pointArr[0].cntPoint[3].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[2].y - 1 * pointArr[0].cntPoint[3].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              finalArray = []
              cntPoint = []

              //計算第4象限
              for (let index = 0; index < pointArr[1].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y })
                  let p1 = 2 * pointArr[1].cntPoint[1].x - 1 * pointArr[1].cntPoint[0].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[1].y - 1 * pointArr[1].cntPoint[0].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y })
                  let p1 = 2 * pointArr[1].cntPoint[2].x - 1 * pointArr[1].cntPoint[3].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[2].y - 1 * pointArr[1].cntPoint[3].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              newPointArr.sort(function (a, b) {
                return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
              });


            } else if (missLeft) {

              //計算第2象限
              for (let index = 0; index < pointArr[0].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y })
                  let p1 = 2 * pointArr[0].cntPoint[0].x - 1 * pointArr[0].cntPoint[1].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[0].y - 1 * pointArr[0].cntPoint[1].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })

                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y })
                  let p1 = 2 * pointArr[0].cntPoint[3].x - 1 * pointArr[0].cntPoint[2].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[3].y - 1 * pointArr[0].cntPoint[2].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              finalArray = []
              cntPoint = []

              // //計算第3象限
              for (let index = 0; index < pointArr[1].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[0].x, 'y': pointArr[1].cntPoint[0].y })
                  let p1 = 2 * pointArr[1].cntPoint[0].x - 1 * pointArr[1].cntPoint[1].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[0].y - 1 * pointArr[1].cntPoint[1].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })

                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[3].x, 'y': pointArr[1].cntPoint[3].y })
                  let p1 = 2 * pointArr[1].cntPoint[3].x - 1 * pointArr[1].cntPoint[2].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[3].y - 1 * pointArr[1].cntPoint[2].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              newPointArr.sort(function (a, b) {
                return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
              });

            }

            pointArr = newPointArr

          }

          //得出缺失的象限 水平 進行補正
          if (vertical) {

            let cntPoint = [];
            let newPointArr = [...pointArr];
            let finalArray = [];

            console.log(vertical)
            if (missTop) {


              for (let index = 0; index < pointArr[0].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[0].x, 'y': pointArr[0].cntPoint[0].y })
                  let p1 = 2 * pointArr[0].cntPoint[0].x - 1 * pointArr[0].cntPoint[3].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[0].y - 1 * pointArr[0].cntPoint[3].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[1].x, 'y': pointArr[0].cntPoint[1].y })
                  let p1 = 2 * pointArr[0].cntPoint[1].x - 1 * pointArr[0].cntPoint[2].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[1].y - 1 * pointArr[0].cntPoint[2].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 3)
              newPointArr.push(finalArray)

              finalArray = []
              cntPoint = []


              for (let index = 0; index < pointArr[1].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[0].x, 'y': pointArr[1].cntPoint[0].y })
                  let p1 = 2 * pointArr[1].cntPoint[0].x - 1 * pointArr[1].cntPoint[3].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[0].y - 1 * pointArr[1].cntPoint[3].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[1].x, 'y': pointArr[1].cntPoint[1].y })
                  let p1 = 2 * pointArr[1].cntPoint[1].x - 1 * pointArr[1].cntPoint[2].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[1].y - 1 * pointArr[1].cntPoint[2].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              console.log(newPointArr)
              newPointArr.sort(function (a, b) {
                return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
              });



            } else if (missBottom) {

              for (let index = 0; index < pointArr[0].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[3].x, 'y': pointArr[0].cntPoint[3].y })
                  let p1 = 2 * pointArr[0].cntPoint[3].x - 1 * pointArr[0].cntPoint[0].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[3].y - 1 * pointArr[0].cntPoint[0].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[0].cntPoint[2].x, 'y': pointArr[0].cntPoint[2].y })
                  let p1 = 2 * pointArr[0].cntPoint[2].x - 1 * pointArr[0].cntPoint[1].x / 1
                  let p2 = 2 * pointArr[0].cntPoint[2].y - 1 * pointArr[0].cntPoint[1].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 3)
              newPointArr.push(finalArray)

              finalArray = []
              cntPoint = []


              for (let index = 0; index < pointArr[1].cntPoint.length; index++) {
                if (index == 0) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[3].x, 'y': pointArr[1].cntPoint[3].y })
                  let p1 = 2 * pointArr[1].cntPoint[3].x - 1 * pointArr[1].cntPoint[0].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[3].y - 1 * pointArr[1].cntPoint[0].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                } else if (index == 2) {
                  cntPoint.push({ 'x': pointArr[1].cntPoint[2].x, 'y': pointArr[1].cntPoint[2].y })
                  let p1 = 2 * pointArr[1].cntPoint[2].x - 1 * pointArr[1].cntPoint[1].x / 1
                  let p2 = 2 * pointArr[1].cntPoint[2].y - 1 * pointArr[1].cntPoint[1].y / 1
                  cntPoint.push({ 'x': p1, 'y': p2 })
                }
              }

              finalArray = calcCntInfo(cntPoint, 4)
              newPointArr.push(finalArray)

              console.log(newPointArr)
              newPointArr.sort(function (a, b) {
                return (a.cntInfo.boundingRect.x + a.cntInfo.boundingRect.y) - (b.cntInfo.boundingRect.x + b.cntInfo.boundingRect.y);
              });




            }

            pointArr = newPointArr

          }

          return AllSortRectangleV2(pointArr);

        }

        //修正矩形
        if (screen_rect_info.fix_judge) {

          //執行結果不府和預期數量執行修正矩形方法1，修正中間被遮擋的問題。
          //!(typeof screen_rect_info.big_boundingRect === "undefined")
          if (!(typeof screen_rect_info.big_boundingRect === "undefined")) {

            let finSortEndPoint = [];
            let point1 = new cv.Point(screen_rect_info.big_rectangle[0]['x'], screen_rect_info.big_rectangle[0]['y']);
            let point2 = new cv.Point(screen_rect_info.big_rectangle[1]['x'], screen_rect_info.big_rectangle[1]['y']);
            let point3 = new cv.Point(screen_rect_info.big_rectangle[2]['x'], screen_rect_info.big_rectangle[2]['y']);
            let point4 = new cv.Point(screen_rect_info.big_rectangle[3]['x'], screen_rect_info.big_rectangle[3]['y']);

            cv.line(drawDst, point1, point2, new cv.Scalar(0, 0, 255), 4, cv.LINE_AA, 0)
            cv.line(drawDst, point1, point4, new cv.Scalar(0, 0, 255), 4, cv.LINE_AA, 0)
            cv.line(drawDst, point3, point2, new cv.Scalar(0, 0, 255), 4, cv.LINE_AA, 0)
            cv.line(drawDst, point3, point4, new cv.Scalar(0, 0, 255), 4, cv.LINE_AA, 0)

            if (screen_rect_info.big_boundingRect.width > screen_rect_info.big_boundingRect.height)
              finSortEndPoint = fix_rect_function_1(screen_rect_info.big_rectangle[0], screen_rect_info.big_rectangle[1], screen_rect_info.big_rectangle[3], screen_rect_info.big_rectangle[2])
            else {
              finSortEndPoint = fix_rect_function_1(screen_rect_info.big_rectangle[0], screen_rect_info.big_rectangle[3], screen_rect_info.big_rectangle[1], screen_rect_info.big_rectangle[2])

              if (workSheetNmae != 'B4') {
                let copyArr = [];
                //交換
                let tmpLen = finSortEndPoint.length / 2;

                for (let f = 0; f < tmpLen; f++) {
                  copyArr.push(finSortEndPoint[f])
                  copyArr.push(finSortEndPoint[f + tmpLen])
                }
                finSortEndPoint = []
                finSortEndPoint = copyArr;
              }

            }

            if (!(typeof finSortEndPoint === "undefined")) {

              if (finSortEndPoint.length != 0) {

                rect_sort_end_point = []

                for (let i = 0; i < finSortEndPoint.length; i++) {

                  //最小外接矩形
                  let xPointArr = [];
                  let yPointArr = [];
                  let Cx = 0, Cy = 0;

                  for (let index = 0; index < finSortEndPoint[i].length; index++) {
                    //有index個x和y (各有4個)
                    Cx += finSortEndPoint[i][index]['x']
                    Cy += finSortEndPoint[i][index]['y']

                    xPointArr.push(finSortEndPoint[i][index]['x'])
                    yPointArr.push(finSortEndPoint[i][index]['y'])
                  }
                  //最小外接矩形左上最小的x y座標
                  let leftTopX = Math.min(...xPointArr)
                  let leftTopY = Math.min(...yPointArr)
                  //最小外接矩形右下最大的x y座標
                  let rightBottomX = Math.max(...xPointArr)
                  let rightBottomY = Math.max(...yPointArr)
                  //最小外接矩形長寬
                  let width = rightBottomX - leftTopX;
                  let height = rightBottomY - leftTopY;
                  //最小外接矩形質心
                  Cx /= finSortEndPoint[i].length;
                  Cy /= finSortEndPoint[i].length;

                  let p = {
                    'cntPoint': finSortEndPoint[i],
                    'cntInfo': {
                      'counter': i,
                      'boundingRect': {
                        'x': leftTopX,
                        'y': leftTopY,
                        'width': width,
                        'height': height
                      },
                      'center': {
                        'x': Cx,
                        'y': Cy
                      }

                    }
                  }
                  rect_sort_end_point.push(p)
                }

              }
            }

          } else {

            const new_rect_sort_end_point = [...rect_sort_end_point];
            rect_sort_end_point = fix_rect_function_2(new_rect_sort_end_point, screen_rect_info)
          }

        }

        //印出矩形
        if (typeof rect_sort_end_point !== "undefined") {
          for (let i = 0; i < rect_sort_end_point.length; i++) {
            rect_sort_end_point[i]['cntInfo'].counter = i + 1;
            drawRectangle(rect_sort_end_point[i], new cv.Scalar(50, 0, 255, 255), drawDst)
          }
        }

        //顯示
        cv.imshow('videoOutput', drawDst);

        //截圖
        snapShot.onclick = function () {
          let object = {}

          object["imgId"] = Date.now();
          object["bigRect"] = screen_rect_info.big_rectangle;
          object["bigBoundingRect"] = screen_rect_info.big_boundingRect;
          object["imgInfo"] = rect_sort_end_point;

          allFramePointXY.push(object);

          let rotateDst = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
          src.copyTo(rotateDst)

          switch (degree) {
            case 0:
              break;
            case 90:
              cv.flip(rotateDst, rotateDst, 0)
              cv.transpose(rotateDst, rotateDst)
              break;
            case 180:
              cv.flip(rotateDst, rotateDst, 1)
              cv.flip(rotateDst, rotateDst, 0)
              break;
            case 270:
              cv.flip(rotateDst, rotateDst, 1)
              cv.transpose(rotateDst, rotateDst)
              break;
            default:
              break;
          }
          captureImg(object, rotateDst);
        }

        let delay = 1000 / FPS - (Date.now() - begin);

        if (canvasLock)
          setTimeout(processVideo, delay);
        else
          clearTimeout(processVideo);

      }
      processVideo();
    }
    showCanvas();
  }

  function drawRectangle(params, color, drawDst) {
    if (degree == 0 || degree == 180) {
      let e1 = new cv.Point(0, videoHeight / 2);
      let e2 = new cv.Point(videoWidth, videoHeight / 2);
      let e3 = new cv.Point(videoWidth / 2, 0);
      let e4 = new cv.Point(videoWidth / 2, videoHeight);
      cv.line(drawDst, e1, e2, new cv.Scalar(255, 255, 255), 1.5, cv.LINE_AA, 0)
      cv.line(drawDst, e3, e4, new cv.Scalar(255, 255, 255), 1.5, cv.LINE_AA, 0)
    } else {
      let e1 = new cv.Point(videoHeight / 2, 0);
      let e2 = new cv.Point(videoHeight / 2, videoWidth);
      let e3 = new cv.Point(0, videoWidth / 2);
      let e4 = new cv.Point(videoHeight, videoWidth / 2);
      cv.line(drawDst, e1, e2, new cv.Scalar(255, 255, 255), 1.5, cv.LINE_AA, 0)
      cv.line(drawDst, e3, e4, new cv.Scalar(255, 255, 255), 1.5, cv.LINE_AA, 0)
    }

    if (typeof params.cntInfo.angle === "undefined")
      color = new cv.Scalar(255, 0, 50, 255)

    //畫矩形
    let point1 = new cv.Point(params['cntPoint'][0]['x'], params['cntPoint'][0]['y']);
    let point2 = new cv.Point(params['cntPoint'][1]['x'], params['cntPoint'][1]['y']);
    let point3 = new cv.Point(params['cntPoint'][2]['x'], params['cntPoint'][2]['y']);
    let point4 = new cv.Point(params['cntPoint'][3]['x'], params['cntPoint'][3]['y']);

    cv.line(drawDst, point1, point2, color, 2, cv.LINE_AA, 0)
    cv.line(drawDst, point1, point4, color, 2, cv.LINE_AA, 0)
    cv.line(drawDst, point3, point2, color, 2, cv.LINE_AA, 0)
    cv.line(drawDst, point3, point4, color, 2, cv.LINE_AA, 0)

    //畫中心圓
    // let centerColor = new cv.Scalar(255, 255, 0);
    // let centerPoint1 = new cv.Point(params.cntInfo.center.x, params.cntInfo.center.y);
    // cv.circle(drawDst, centerPoint1, 15, centerColor, 1, cv.LINE_AA, 0)

    //畫字
    let centerPoint2 = new cv.Point(params.cntInfo.center.x - 15, params.cntInfo.center.y + 15);
    cv.putText(drawDst, params.cntInfo.counter.toString(), centerPoint2, cv.FONT_HERSHEY_SIMPLEX, 1.2, new cv.Scalar(0, 0, 0), 2, 4, false);
    // 畫最小外接矩形
    // let boundingRectPoint1 = new cv.Point(params.cntInfo.boundingRect.x, params.cntInfo.boundingRect.y);
    // let boundingRectPoint2 = new cv.Point(params.cntInfo.boundingRect.x + params.cntInfo.boundingRect.width, params.cntInfo.boundingRect.y + params.cntInfo.boundingRect.height);
    // cv.rectangle(drawDst, boundingRectPoint1, boundingRectPoint2, new cv.Scalar(0, 255, 0, 255), 1, cv.LINE_AA, 0)

  }

  function AllSortRectangleV2(momentPointXY, drawDst, drawLine) {

    let totlaResult = []

    let horizon = false;

    for (let k = 0; k < momentPointXY.length; k++) {

      const element = momentPointXY[k].cntInfo.angle;

      if (typeof element !== "undefined" && workSheetNmae == 'A8')
        horizon = element < 50 ? false : true;

      if (typeof element !== "undefined" && workSheetNmae == 'B4')
        horizon = element < 20 ? false : true;

      if (workSheetNmae == 'A4')
        horizon = true;

    }

    if (workSheetNmae == 'B4') {

      if (horizon)
        momentPointXY.sort(function (a, b) { return a['cntInfo']['center'].x - b['cntInfo']['center'].x });
      else
        momentPointXY.sort(function (a, b) { return a['cntInfo']['center'].y - b['cntInfo']['center'].y });

      return momentPointXY
    }

    let horizontalSort = function () {

      if (momentPointXY.length != 0) {

        let newSortEndPointXY = [...momentPointXY];

        let center = {
          'x': 0,
          'y': 0,
          'totalAngle': 0,
          'tx': 0,
          'ty': 0
        }

        for (let d = 0; d < newSortEndPointXY.length; d++) {
          center.totalAngle += newSortEndPointXY[d].cntInfo.angle
          center.x += newSortEndPointXY[d].cntInfo.center.x;
          center.y += newSortEndPointXY[d].cntInfo.center.y;
        }

        center.totalAngle /= newSortEndPointXY.length;
        center.x /= newSortEndPointXY.length;
        center.y /= newSortEndPointXY.length;

        let dxdy =
          (newSortEndPointXY[0]['cntPoint'][1].x - newSortEndPointXY[0]['cntPoint'][2].x) /
          (newSortEndPointXY[0]['cntPoint'][1].y - newSortEndPointXY[0]['cntPoint'][2].y)


        let d2 = center.x * 2 * dxdy / 2;
        let y2 = new cv.Point(0, center.y + d2);
        let y1 = new cv.Point(center.x * 2, center.y - d2);

        let b = (dxdy * center.x - center.y) * -1

        if (0) {

          cv.circle(drawDst, new cv.Point(0, center.y), 5, new cv.Scalar(255, 255, 255), 10, cv.LINE_AA, 0);
          cv.circle(drawDst, new cv.Point(y1.x, center.y), 5, new cv.Scalar(255, 255, 255), 10, cv.LINE_AA, 0);
          cv.line(drawDst, new cv.Point(0, center.y), new cv.Point(y1.x, center.y), new cv.Scalar(255, 0, 0), 10, cv.LINE_AA, 0)

          cv.line(drawDst, y1, new cv.Point(center.x, center.y), new cv.Scalar(255, 0, 0), 6, cv.LINE_AA, 0)
          cv.line(drawDst, y2, new cv.Point(center.x, center.y), new cv.Scalar(255, 0, 255), 3, cv.LINE_AA, 0)

        }

        if (newSortEndPointXY.length) {

          let result1 = newSortEndPointXY.filter(function (ele) {
            // m * x - y + b = 0
            // m * x - y + b > 0
            // m * x - y + b < 0
            let val = ((y2.x - y1.x) * (ele.cntInfo.center.y - y1.y) - (y2.y - y1.y) * (ele.cntInfo.center.x - y1.x)).toFixed(0)

            return val > 0
          })
          let result2 = newSortEndPointXY.filter(function (ele) {

            let val = ((y2.x - y1.x) * (ele.cntInfo.center.y - y1.y) - (y2.y - y1.y) * (ele.cntInfo.center.x - y1.x)).toFixed(0)

            return val < 0
          })

          result1.sort(function (a, b) {
            return a['cntInfo']['center'].x - b['cntInfo']['center'].x
          })
          result2.sort(function (a, b) {
            return a['cntInfo']['center'].x - b['cntInfo']['center'].x
          })

          totlaResult = result1.concat(result2);

          let vJudge = function (totlaResult) {

            let ret = [];

            for (let e = 0; e < totlaResult.length - 1; e++) {

              const element1 = newSortEndPointXY[e];
              const element2 = newSortEndPointXY[e + 1];

              let ddd = Math.pow(element2.cntInfo.center.x - element1.cntInfo.center.x, 2) +
                Math.pow(element2.cntInfo.center.y - element1.cntInfo.center.y, 2)

              ddd = Math.sqrt(ddd)
              ret.push(ddd)

            }

            const map1 = ret.map(x => (x / 200).toFixed(0));

            let lock = 0;

            for (let t = 0; t < map1.length; t++) {
              const element = map1[t];
              if (element != "1") {
                lock = 1;
                break;
              }

            }

            return lock
          }

          const tempRes = vJudge(totlaResult) ? totlaResult : totlaResult.sort(function (a, b) { return a['cntInfo']['center'].x - b['cntInfo']['center'].x });

          totlaResult = []
          totlaResult = tempRes;

        }

      } else {

        totlaResult = momentPointXY
      }

    }

    let verticalSort = function () {
      let newSortEndPointXY = [...momentPointXY];

      let center = {
        'x': 0,
        'y': 0,
        'totalAngle': 0,
        'tx': 0,
        'ty': 0
      }

      for (let d = 0; d < newSortEndPointXY.length; d++) {
        center.totalAngle += newSortEndPointXY[d].cntInfo.angle
        center.x += newSortEndPointXY[d].cntInfo.center.x;
        center.y += newSortEndPointXY[d].cntInfo.center.y;
      }

      center.totalAngle /= newSortEndPointXY.length;
      center.x /= newSortEndPointXY.length;
      center.y /= newSortEndPointXY.length;

      let dxdy =
        (newSortEndPointXY[0]['cntPoint'][1].x - newSortEndPointXY[0]['cntPoint'][2].x) /
        (newSortEndPointXY[0]['cntPoint'][1].y - newSortEndPointXY[0]['cntPoint'][2].y)

      let d1 = center.x * 2 * dxdy / 2;
      let d = center.y * 2 * dxdy / 2;

      let x1 = new cv.Point(center.x + d, center.y * 2);
      let x2 = new cv.Point(center.x - d, 0);

      let y1 = new cv.Point(center.x * 2, center.y - d1);
      let y2 = new cv.Point(0, center.y + d1);

      // cv.line(drawDst, x1, new cv.Point(center.x, center.y), new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)
      // cv.line(drawDst, x2, new cv.Point(center.x, center.y), new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)
      // cv.line(drawDst, new cv.Point(center.x, center.y), y1, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)
      // cv.line(drawDst, new cv.Point(center.x, center.y), y2, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)
      // cv.circle(drawDst, new cv.Point(center.x, center.y), 10, new cv.Scalar(255, 255, 255), 6, cv.LINE_AA, 0);

      //多次分割 線上方 線中間 線下方
      let result1 = newSortEndPointXY.filter(function (ele) {

        let c = {
          'x': ele.cntInfo.center.x,
          'y': ele.cntInfo.center.y
        }
        let val = ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)).toFixed(0)

        return val > 0 && val > 7000;
      })

      let result2 = newSortEndPointXY.filter(function (ele) {

        let c = {
          'x': ele.cntInfo.center.x,
          'y': ele.cntInfo.center.y
        }
        let val = ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)).toFixed(0)

        return val < 0 && val < -7000;
      })

      let result3 = newSortEndPointXY.filter(function (ele) {

        let c = {
          'x': ele.cntInfo.center.x,
          'y': ele.cntInfo.center.y
        }
        let val = ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)).toFixed(0)

        return val > -7000 && val < 7000;
      })

      // console.log('===============')
      // newSortEndPointXY.forEach(function (ele) {
      // 	let c = {
      // 		'x': ele.cntInfo.center.x,
      // 		'y': ele.cntInfo.center.y
      // 	}
      // 	let val = ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)).toFixed(0)
      // 	console.log(val)
      // })
      // console.log('===============')

      let sort = function (array) {

        let ctx = 0, cty = 0;

        for (let d = 0; d < array.length; d++) {
          ctx += array[d].cntInfo.center.x;
          cty += array[d].cntInfo.center.y;
        }

        center.totalAngle /= array.length;
        ctx /= array.length;
        cty /= array.length;

        let sortdxdy =
          (array[0]['cntPoint'][1].x - array[0]['cntPoint'][2].x) /
          (array[0]['cntPoint'][1].y - array[0]['cntPoint'][2].y)

        let d1 = ctx * 2 * sortdxdy / 2;

        let y1 = new cv.Point(ctx * 2, cty - d1);
        let y2 = new cv.Point(0, cty + d1);

        // cv.circle(drawDst, new cv.Point(ctx, cty), 20, new cv.Scalar(0, 180, 180), 10, cv.LINE_AA, 0);
        // cv.line(drawDst, new cv.Point(ctx, cty), y1, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)
        // cv.line(drawDst, new cv.Point(ctx, cty), y2, new cv.Scalar(200, 0, 200), 10, cv.LINE_AA, 0)

        let r1 = array.filter(function (ele) {
          let c = {
            'x': ele.cntInfo.center.x,
            'y': ele.cntInfo.center.y
          }

          return ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)) > 0
        });

        let r2 = array.filter(function (ele) {
          let c = {
            'x': ele.cntInfo.center.x,
            'y': ele.cntInfo.center.y
          }
          return ((y2.x - y1.x) * (c.y - y1.y) - (y2.y - y1.y) * (c.x - y1.x)) < 0
        });

        r1.sort(function (a, b) {
          return a['cntInfo']['center'].x - b['cntInfo']['center'].x
        })

        r2.sort(function (a, b) {
          return a['cntInfo']['center'].x - b['cntInfo']['center'].x
        })

        let r1Andr2 = r1.concat(r2);

        if (r1Andr2.length == 2) {

          let rdxdy =
            (r1Andr2[0]['cntInfo']['center'].x - r1Andr2[1]['cntInfo']['center'].x) /
            (r1Andr2[0]['cntInfo']['center'].y - r1Andr2[1]['cntInfo']['center'].y)

          if (isFinite(rdxdy)) {

            let rdxdyAbs = Math.abs(rdxdy)

            let vJudge = function (totlaResult) {

              let ret = [];
              let lock = false;

              for (let e = 0; e < totlaResult.length - 1; e++) {
                const element1 = totlaResult[e];
                const element2 = totlaResult[e + 1];

                // cv.line(drawDst,
                // 	new cv.Point(element2.cntInfo.center.x, element2.cntInfo.center.y),
                // 	new cv.Point(element1.cntInfo.center.x, element1.cntInfo.center.y),
                // 	new cv.Scalar(200, 0, 200), 2, cv.LINE_AA, 0)

                let ddd = Math.pow(element2.cntInfo.center.x - element1.cntInfo.center.x, 2) +
                  Math.pow(element2.cntInfo.center.y - element1.cntInfo.center.y, 2)
                ddd = Math.sqrt(ddd)
                ret.push(ddd)
              }

              const map1 = ret.filter(x => 200 * 2 < x);

              if (map1.length)
                lock = true

              return lock;
            }

            let Diagonal = vJudge(r1Andr2)

            if (Diagonal) {

              //console.log('對角')
              r1Andr2.sort(function (a, b) {
                //水平由左而右排列
                return a.cntInfo.center.x - b.cntInfo.center.x
              })
              if (r1Andr2[1].cntInfo.center.y < r1Andr2[0].cntInfo.center.y) {
                let temp = r1Andr2[1];
                r1Andr2[1] = r1Andr2[0];
                r1Andr2[0] = temp;
                // cv.circle(drawDst, new cv.Point(r1Andr2[1].cntInfo.center.x, r1Andr2[1].cntInfo.center.x),
                // 10, new cv.Scalar(0, 0, 180), 6, cv.LINE_AA, 0);
              }



            } else {


              let hjudge = 0;

              r1Andr2.forEach(function (ele) {

                if (ele.cntInfo.center.x < (ctx + 70) && ele.cntInfo.center.x > (ctx - 70)) {
                  hjudge = 0
                  //console.log('垂直')
                } else {
                  hjudge = 1;
                  //console.log('水平')
                }

              })

              if (hjudge) {
                r1Andr2.sort(function (a, b) {

                  return a.cntInfo.center.x - b.cntInfo.center.x
                })
              } else {
                r1Andr2.sort(function (a, b) {

                  return a.cntInfo.center.y - b.cntInfo.center.y
                })
              }

            }

            // if (rdxdyAbs > 0.1 && rdxdyAbs < 0.5) {
            // 	console.log('v')
            // 	r1Andr2.sort(function (a, b) {
            // 		//垂直由上而下排列
            // 		return a.cntInfo.center.y - b.cntInfo.center.y
            // 	})

            // } else if (rdxdyAbs > 1 && rdxdyAbs < 35 && !Diagonal) {

            // 	console.log('h')
            // 	r1Andr2.sort(function (a, b) {
            // 		//水平由左而右排列
            // 		return a.cntInfo.center.x - b.cntInfo.center.x

            // 	})

            // } else if (Diagonal) {

            // 	console.log('d')
            // 	r1Andr2.sort(function (a, b) {
            // 		//水平由左而右排列
            // 		return a.cntInfo.center.x - b.cntInfo.center.x
            // 	})
            // 	if (r1Andr2[1].cntInfo.center.y < r1Andr2[0].cntInfo.center.y) {

            // 		let temp = r1Andr2[1];
            // 		r1Andr2[1] = r1Andr2[0];
            // 		r1Andr2[0] = temp;


            // 		// cv.circle(drawDst, new cv.Point(r1Andr2[1].cntInfo.center.x, r1Andr2[1].cntInfo.center.x),
            // 		// 10, new cv.Scalar(0, 0, 180), 6, cv.LINE_AA, 0);

            // 	}

            // 	console.log('對角')
            // }

          }

        }

        if (array.length == 1) {

          return array;
        }

        return r1Andr2
      }

      //console.log(result3.length, result2.length, result1.length)
      if (result3.length && result2.length && result1.length) {
        result1 = sort(result1);
        result2 = sort(result2);
        result3 = sort(result3);

      } else if (result2.length && result1.length) {
        result1 = sort(result1);
        result2 = sort(result2);

      }

      // totlaResult = result1
      // totlaResult = result2
      // totlaResult = result3

      totlaResult = result1.concat(result3).concat(result2)
    }

    if (momentPointXY.length)
      horizon ? horizontalSort() : verticalSort();

    return totlaResult
  }

  function sortRectangle(momentPointXY, drawDst, removeNum) {

    let newPointXY = [];

    function filterRect(originPoint) {

      let offsetXY = 75;
      let originX = originPoint[0]['cntInfo']['center']['x'];
      let origin1 = originPoint.filter(function (value, index, array) {
        if (value['cntInfo']['center']['x'] <= originX + offsetXY && value['cntInfo']['center']['x'] >= originX - offsetXY) {
          return value
        }
      })

      for (let i = 0; i < origin1.length; i++) {

        let b1 = new cv.Point(origin1[i].cntInfo.boundingRect.x, origin1[i].cntInfo.boundingRect.y);
        let b2 = new cv.Point(origin1[i].cntInfo.boundingRect.x + origin1[i].cntInfo.boundingRect.width, origin1[i].cntInfo.boundingRect.y + origin1[i].cntInfo.boundingRect.height);
        cv.rectangle(drawDst, b1, b2, new cv.Scalar(0, 255, 0, 255), 1, cv.LINE_AA, 0)

        for (let j = 0; j < originPoint.length; j++) {

          if ((originPoint[j]['cntInfo']['center']['y'] >= origin1[i]['cntInfo']['center']['y'] - offsetXY)
            && (originPoint[j]['cntInfo']['center']['y'] <= origin1[i]['cntInfo']['center']['y'] + offsetXY)) {

            newPointXY.push(originPoint[j]);
          }
        }
      }

    }

    if (momentPointXY.length != 0) {

      let tempxy = momentPointXY.slice(0);

      filterRect(momentPointXY);

      if (momentPointXY.length - newPointXY.length != 0) {

        for (let i = 0; i < momentPointXY.length; i++) {
          for (let j = 0; j < newPointXY.length; j++) {
            if (momentPointXY[i]['cntInfo']['counter'] === newPointXY[j][['cntInfo']]['counter']) {
              delete tempxy[i]
            }
          }
        }
        let cleanArray = tempxy.filter(function () { return true });
        if (cleanArray.length != 0) {
          filterRect(cleanArray)
        }
      }
    }

    if (removeNum) {
      newPointXY = removeDuplicates(newPointXY, 'cntInfo', 'counter');
    }

    return newPointXY;
  }

  function captureImg(imgObject, imgSrc) {

    cv.imshow('videoOutput', imgSrc);
    let canvas = document.getElementById("videoOutput");
    let dataURL = canvas.toDataURL("image/jpeg", 1.0);

    //把圖片訊息(json)用字串的方式寫入localStorage
    localStorage.setItem(imgObject['imgId'], JSON.stringify(imgObject))


    //把圖片檔案寫入fileSystem 寫入特定目錄
    console.log(paperClassVal.value)
    fileSystem.root.getDirectory(paperClassVal.value, { create: true }, function (dirEntry) {
      dirEntry.getFile(imgObject['imgId'] + '.jpeg', {
        create: true
      }, function (fileEntry) {
        // Create a FileWriter object for our FileSystemFileEntry (log.txt).
        fileEntry.createWriter(function (fileWriter) {
          fileWriter.onwriteend = function (e) {

            console.log('Write completed.');
          };
          fileWriter.onerror = function (e) {
            console.log('Write failed: ' + e.toString());
          };
          //dataurl轉blob
          var blob = dataURItoBlob(dataURL);
          //寫入blob
          fileWriter.write(blob);
        }, function () {
          console.log("error");
        });
      }, function (fs) {
        console.log(fs.message);
      });
    });
  }

  function detectionRectangle(dst, drawDst) {

    // let point1 = new cv.Point(0, 0);
    // let point2 = new cv.Point(250,250);
    // cv.rectangle(drawDst, point1, point2, new cv.Scalar(0, 255, 0, 255), 1, cv.LINE_AA, 0)

    var framePointXY = [];

    cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 17, 9)

    let erodeKernelSize = new cv.Size(3, 3);
    let kernel = cv.getStructuringElement(cv.MORPH_RECT, erodeKernelSize)
    cv.erode(dst, dst, kernel);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();


    cv.findContours(dst, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

    let hierarchyArr = [];
    let start = 0;
    let end = 4;
    let row = hierarchy.data32S.length / end;

    for (let i = 0; i < row; i++) {
      hierarchyArr[i] = [];
      for (let k = 0; k < 4; k++) {
        hierarchyArr[i][k] = hierarchy.data32S[start];
        start++;
      }
      start = end;
      end = end + 4;
    }

    for (let i = 0; i < contours.size(); i++) {

      const ci = contours.get(i)
      let peri1 = cv.arcLength(ci, true);
      let peri2 = epsilon * peri1;
      let approx = new cv.Mat();

      cv.approxPolyDP(ci, approx, peri2, true);

      let t1 = 3.0
      let t2 = 15.0

      let filterContours = function () {

        if (approx.rows == 4 && peri2 > t1) {

          let maxArea = 0;
          let totalArea = 0;

          //提取大的輪廓
          if (hierarchyArr[i][0] > 0 && hierarchyArr[i][1] > 0 &&
            hierarchyArr[i][3] > 0 && hierarchyArr[i][2] == -1 &&
            peri2 > 10) {


            let tempBoundingRect = cv.boundingRect(ci)
            if (tempBoundingRect.width > videoWidth * 0.15 && tempBoundingRect.height > videoWidth * 0.15) {

              let Area = cv.contourArea(ci)
              if (maxArea < Area)
                maxArea = Area

              let point_XY = [];
              for (let i = 0; i < approx.data32S.length; i += 2) {
                let cnt = []
                cnt['x'] = approx.data32S[i]
                cnt['y'] = approx.data32S[i + 1]
                point_XY.push(cnt)
                cnt = []
              }

              let M = cv.moments(ci, false);
              let cx = M.m10 / M.m00
              let cy = M.m01 / M.m00



              let rect = cv.boundingRect(ci);
              //console.log(rect.width / rect.height)

              const center = {
                'x': cx,
                'y': cy
              }

              const angles = point_XY.map(({
                x,
                y
              }) => {
                return {
                  x,
                  y,
                  angle: Math.atan2(y - center.y, x - center.x) * 180 / Math.PI
                };
              });

              framePointXY['bigRect'] = angles.sort((a, b) => a.angle - b.angle);
              framePointXY['maxArea'] = maxArea;
              framePointXY['bigBoundingRect'] = tempBoundingRect;
              // cv.drawContours(drawDst, contours, i, new cv.Scalar(100, 100, 255, 255), 2, cv.LINE_8, hierarchy, false)
            }
          }

          //提取小的輪廓
          if (hierarchyArr[i][3] == -1 && hierarchyArr[i][0] != -1) {

            let point_XY = [];

            for (let i = 0; i < approx.data32S.length; i += 2) {
              let cnt = []
              cnt['x'] = approx.data32S[i]
              cnt['y'] = approx.data32S[i + 1]

              point_XY.push(cnt)
              cnt = []
            }

            //中心
            let M = cv.moments(ci, false);
            let cx = M.m10 / M.m00
            let cy = M.m01 / M.m00
            const center = {
              'x': cx,
              'y': cy
            }

            //最小外接矩形
            let boundingRect = cv.boundingRect(ci)
            totalArea += cv.contourArea(ci)

            //角度
            const angles = point_XY.map(({
              x,
              y
            }) => {
              return {
                x,
                y,
                angle: Math.atan2(y - center.y, x - center.x) * 180 / Math.PI
              };
            });

            let pointsSorted = {
              "cntPoint": []
            }

            // 根據角度排序矩形輪廓的點
            pointsSorted["cntPoint"] = angles.sort((a, b) => a.angle - b.angle);

            //過濾
            let judge = function () {

              let lock = 1;
              let tempAngle = 0;
              let tempValue = 500000;

              //太扁的矩形和奇怪形狀的矩形的數據
              let lineMidPoints = [];
              for (let index = 0; index < pointsSorted["cntPoint"].length; index++) {
                if (index != 3) {
                  let temp = {};
                  temp.x = (pointsSorted["cntPoint"][index].x + pointsSorted["cntPoint"][index + 1].x) / 2;
                  temp.y = (pointsSorted["cntPoint"][index].y + pointsSorted["cntPoint"][index + 1].y) / 2;

                  let p1 = {
                    x: pointsSorted["cntPoint"][index].x,
                    y: pointsSorted["cntPoint"][index].y
                  }
                  let p2 = {
                    x: pointsSorted["cntPoint"][index + 1].x,
                    y: pointsSorted["cntPoint"][index + 1].y
                  }
                  let angle = Math.atan2((p1.y - p2.y), (p2.x - p1.x)) //弧度
                  let theta = angle * (180 / Math.PI); //角度  36.86989764584402
                  temp.angle = theta;

                  lineMidPoints.push(temp)
                } else if (index == 3) {
                  let temp = {};
                  temp.x = (pointsSorted["cntPoint"][index].x + pointsSorted["cntPoint"][index - index].x) / 2;
                  temp.y = (pointsSorted["cntPoint"][index].y + pointsSorted["cntPoint"][index - index].y) / 2;

                  let p1 = {
                    x: pointsSorted["cntPoint"][index].x,
                    y: pointsSorted["cntPoint"][index].y
                  }
                  let p2 = {
                    x: pointsSorted["cntPoint"][index - index].x,
                    y: pointsSorted["cntPoint"][index - index].y
                  }
                  let angle = Math.atan2((p1.y - p2.y), (p2.x - p1.x)) //弧度
                  let theta = angle * (180 / Math.PI); //角度  36.86989764584402
                  temp.angle = theta;

                  lineMidPoints.push(temp)
                }
              }


              for (let index = 0; index < lineMidPoints.length; index++) {
                let tempVal = 0;
                tempVal = Math.pow(lineMidPoints[index].x - center.x, 2)
                tempVal += Math.pow(lineMidPoints[index].y - center.y, 2)
                tempVal = Math.sqrt(tempVal);
                if (tempVal < tempValue) {
                  tempValue = tempVal
                }
                tempAngle += Math.abs(lineMidPoints[index].angle);
              }

              // 過濾太扁的矩形
              if (!(tempValue > 30)) {
                lock = 0;
              }

              let ratio = boundingRect.height / boundingRect.width
              if (ratio > 4 || ratio < 0.2) {
                lock = 0
              }

              // 過濾奇怪形狀的矩形
              if (!(tempAngle > 350 && tempAngle < 370)) {
                lock = 0;
              }

              // 過濾邊邊的矩形或是太大的矩形
              let temp1 = boundingRect.x + boundingRect.width;
              let temp2 = boundingRect.y + boundingRect.height;
              if (temp1 == videoWidth || temp2 == videoHeight) {
                lock = 0;
              }

              //x or y == 0 就濾除
              //之前是同時等於0才濾除
              if ((boundingRect.x == 0 || boundingRect.y == 0)) {
                lock = 0;
              }


              return lock;
            }

            if (judge()) {

              // let point1 = new cv.Point(boundingRect.x, boundingRect.y);
              // let point2 = new cv.Point(boundingRect.x + boundingRect.width, boundingRect.y + boundingRect.height);
              // cv.rectangle(drawDst, point1, point2, new cv.Scalar(0, 255, 0, 255), 1, cv.LINE_AA, 0)
              //let b1 = new cv.Point(boundingRect.x, boundingRect.y);
              //let b2 = new cv.Point(boundingRect.x + boundingRect.width, boundingRect.y + boundingRect.height);
              //cv.rectangle(drawDst, b1, b2, new cv.Scalar(0, 255, 0, 255), 1, cv.LINE_AA, 0)

              // cv.drawContours(drawDst, contours, i, new cv.Scalar(100, 100, 255, 255), 2, cv.LINE_8, hierarchy, false)

              let line = new cv.Mat();
              cv.fitLine(ci, line, cv.DIST_L2, 0, 0.01, 0.01);
              let vx = line.data32F[0];

              pointsSorted['cntInfo'] = {}
              pointsSorted['cntInfo']['center'] = center;
              pointsSorted['cntInfo']['angle'] = Math.acos(vx) * 180 / Math.PI;
              // console.log(Math.acos(vx) * 180 / Math.PI)
              pointsSorted['cntInfo']['counter'] = Math.random().toFixed(4);
              pointsSorted['cntInfo']['boundingRect'] = boundingRect;
              framePointXY['totalArea'] = totalArea;

              framePointXY.push(pointsSorted);
            }

          }

        }

      }

      filterContours();
      ci.delete();
      approx.delete();
    }

    hierarchyArr = [];
    contours.delete();
    hierarchy.delete();
    return framePointXY;
  }

  function removeDuplicates(originalArray, prop1, prop2) {
    let newArray = [];
    let lookupObject = {};

    for (var i in originalArray) {
      lookupObject[originalArray[i][prop1][prop2]] = originalArray[i];
    }

    for (i in lookupObject) {
      newArray.push(lookupObject[i]);
    }
    return newArray;
  }

  function qrCodeScanner() {

    let videoElem = document.getElementById("streamVideo")
    const qrScanner = new QrScanner(videoElem, function (result) {

      if (result != "QR code not found.") {

        console.log(result)

        if (workSheetClass[1] != result) {
          workSheetClass[1] = result;
          workSheetClass[0] = workSheetClass[1];
        }

      } else {

        console.log(result)
      }

    }, videoHeight);

    qrScanner.setInversionMode('both');

    qrScanner.start();

  }

  function getUserMedia() {
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: {
          exact: videoWidth
        },
        height: {
          exact: videoHeight
        },
        deviceId: fristDeviceId[0]

      }
    })
      .then(function (stream) {
        let video = document.getElementById("streamVideo");
        video.width = videoWidth;
        video.height = videoHeight;
        // 旧的浏览器可能没有srcObject
        if ("srcObject" in video) {

          video.srcObject = stream;

        } else {
          // 防止在新的浏览器里使用它，应为它已经不再支持了
          video.src = window.URL.createObjectURL(stream);
        }
        video.onloadedmetadata = function (e) {
          video.play();
        };
      })
      .then(function () {
        //qrCodeScanner();
        scannerLoop();
        //canvasStart();
      })
      .catch(function (err) {

        console.log(err.name + ": " + err.message);
      });
  }

  function playVideo() {
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
      devices.forEach(function (device) {
        if (device.kind == "videoinput") {
          console.log(device)
          let fristDevice = device.label.split(' ')
          if (fristDevice[0] == "OKIOCAM") {
            fristDeviceId.push(device.deviceId)
          } else {
            fristDeviceId.push(device.deviceId)
          }
        }
      })

    }).then(function () {

      getUserMedia();
    })
  }

  function requestFileSystem() {

    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

    let requestedBytes = 1024 * 1024 * 550; //550MB

    navigator.webkitPersistentStorage.requestQuota(
      requestedBytes,
      function (grantedBytes) {
        window.requestFileSystem(PERSISTENT, grantedBytes, function (fs) {
          fileSystem = fs;
        }, function () {
          console.log('Error');
        });
      },
      function (e) {
        console.log('Error', e);
      }
    );


    navigator.webkitPersistentStorage.queryUsageAndQuota(function (usage, quota) {
      //usage已經使用的空間，quota申請的總空間
      if (!quota) {
        //還沒有申請過空間
        console.log("nono");
      } else {
        console.log("presence");
        console.log("Total:" + quota);
        console.log("Usage:" + usage);
      }
    });

  }

  function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
    else
      byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], { type: mimeString });
  }

  playVideo();
  requestFileSystem();
});
