# OpenCV.js 辨識應用

## 原理說明

## opencv.js 辨別紙張上的矩形區域

### 影片

用opencv辨識每一個frame並且繪製到canvas上，在繪製到canvas上之前如果辨識結果有缺失(比如被手擋住)，導致結果不符合預期，會根據已辨識出來的內容將，座標盡可能補齊，然後呈現出來。

https://youtu.be/JhwWStJe5N0

[![](http://img.youtube.com/vi/JhwWStJe5N0/0.jpg)](http://www.youtube.com/watch?v=JhwWStJe5N0 "")

#### 辨識方式

對圖片做灰度化 &rArr; 二值化 &rArr; 發現輪廓(findContours)

<img src="https://i.imgur.com/fiZ3wB1.png" width="600" />  灰度化

<img src="https://i.imgur.com/r7o5DCU.png" width="600" />  二值化

<img src="https://i.imgur.com/oCkHvZT.png" width="600" />  發現輪廓

可以看到圖片上有藍色的線條，這些線條都是一個個的輪廓(包含一堆座標```{x:x,y:y}``` 的Array)所繪製出來的，我們需要提取當中的矩形輪廓，所以我們需要對每個輪廓做輪廓近似，使用輪廓近似後的結果來濾除不要的矩形。

文件參考
https://docs.opencv.org/3.4/d4/d73/tutorial_py_contours_begin.html

最後就會長這樣

![](https://i.imgur.com/DoIzQ4I.jpg)

可以看到邊邊還是有一些輪廓被程式判定成矩形，所以還會根據輪廓的大小座標位置等盡可能把誤判的輪廓濾除。

濾除後的結果

![](https://i.imgur.com/yFYquMd.jpg)

上圖的輪廓總共有八個，一個輪廓可能有幾百到幾千個座標，剛剛我們已經做過輪廓近似，之後會將輪廓近似的結果儲存下來，結果為矩形的頂點，每一個矩形的4個頂點座標，圖中為8個矩形一個矩形有4個頂點座標，並且將矩形由左到右從上到下排列。


如果輪廓的數量不符合我們的預期，就會根據已知的矩形的座標相對位置，反推出缺失的矩形位置，所以即使畫面受到干擾，比如手擋住，造成辨識錯誤，也能在一定的狀況，反補缺失的矩形座標。

需要改進的是，在補正的過程中，寫了了大量的分支判斷，簡單說就是一堆的if和else，以及一堆些座標計算的邏輯，來確認各種可能，這個問題有很大的程度上是可以進行優化的，

<img src="https://i.imgur.com/6kLmvqA.jpg" width="600" />辨識的結果

<img src="https://i.imgur.com/RhcdPGw.jpg" width="600" />補正的結果


最後根據座標繪製結果，將串流影片中的每個frame(每個圖片)，繪製到canvas上就會變成Real Time辨識的樣子。


## opencv.js 辨識結果座標製作圖片比較功能

當User從影片串流當中截取圖片時，會將圖片儲存在File System，而座標辨識資料則會存在Local Storage，即使網頁關閉資料依舊會存在於瀏覽器中。

儲存在Local Storage的座標是一個物件，物件中儲存了每個矩形的四個頂點座標，有了這個座標就相當於知道，紙上題目矩形的位置，程式會將每個矩形排序由左到右由上到下編號，每個矩形都具四個頂點座標，根據編號和座標將不同圖片的相同區域放大顯示給使用者，讓使用者可以做比較。

所以User可以選擇1號考卷的B號題目(矩形區域)和2號考卷B號題目(矩形區域)做比較，依靠座標位置和CSS來達到這個功能。


影片
https://youtu.be/1dPYB-X2DPU

[![](http://img.youtube.com/vi/1dPYB-X2DPU/0.jpg)](http://www.youtube.com/watch?v=1dPYB-X2DPU "")

