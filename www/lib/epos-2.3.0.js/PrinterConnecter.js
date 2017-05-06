function connect(ipAddress, port, deviceId) {

    var ipAddress = ipAddress;
    var port = port;
    var deviceId = deviceId;


    ePosDev = new epson.ePOSDevice();
    ePosDev.connect(ipAddress, port, function(code) {
        if (code.indexOf('OK') !== -1) {
            ePosDev.createDevice(deviceId,
                ePosDev.DEVICE_TYPE_PRINTER, { crypto: false, buffer: false },
                function(data, code) {
                    if (code.indexOf('OK') !== -1) {
                        printer = data;
                        attachPrinterEvent();
                        attachDeviceEvent();
                        addImage();
                    } else {
                        console.log('error');

                    }
                });
        }
        if (code.indexOf('ERROR') !== -1) {

        }
    }, { eposprint: true });

}

/**************************************************
// attachPrinterEvent()
**************************************************/
function attachDeviceEvent() {

    console.log('attachDeviceEvent');
    //document.getElementById('console').innerHTML += 'attachDeviceEvent<br />';

    ePosDev.onreconnecting = function() {
    	console.log('ePosDev:onreconnecting');
      //document.getElementById('console').innerHTML += 'ePosDev:onreconnecting<br />';
    };
    ePosDev.onreconnect = function() {
        console.log('ePosDev:onreconnect');
     //document.getElementById('console').innerHTML += 'ePosDev:onreconnect<br />';
    };
    ePosDev.ondisconnect = function() {
        console.log('ePosDev:ondisconnect');
      //document.getElementById('console').innerHTML += 'ePosDev:ondisconnect<br />';
    };

}

/**************************************************
// attachPrinterEvent()
**************************************************/
function attachPrinterEvent() {

    console.log('attachPrinterEvent');

    // Set a response receipt callback function
    printer.onreceive = function(res) {
        console.log('\
          Print' + (res.success ? 'Success' : 'Failure') + '\n\
          Code:' + res.code + '\n\
          Battery:' + res.battery + '\n\
          ' + getStatusText(res.status) + '\
          ');
        //document.getElementById('console').innerHTML += 'Print' + (res.success ? 'Success' : 'Failure') + '<br />';
    };

    printer.onerror = function(err) {
    	//alert(err.status);
    };

    // Set a status change callback funciton
    printer.onstatuschange = function(status) {
        console.log('Printer:onstatuschange');
    };
    printer.ononline = function() {
        console.log('Printer:ononline');
    };
    printer.onoffline = function() {
        console.log('Printer:onoffline');
    };
    printer.onpoweroff = function() {
        console.log('Printer:onpoweroff');
    };
    printer.oncoverok = function() {
        console.log('Printer:oncoverok');
    };
    printer.oncoveropen = function() {
        console.log('Printer:oncoveropen');
    };
    printer.onpaperok = function() {
        console.log('Printer:onpaperok');
    };
    printer.onpapernearend = function() {
        console.log('Printer:onpapernearend');
    };
    printer.onpaperend = function() {
        console.log('Printer:onpaperend');
    };
    printer.ondrawerclosed = function() {
        console.log('Printer:ondrawerclosed');
    };
    printer.ondraweropen = function() {
        console.log('Printer:ondraweropen');
    };
    printer.onbatterystatuschange = function() {
        console.log('Printer:onbatterystatuschange');
    };
    printer.onbatteryok = function() {
        console.log('Printer:onbatteryok');
    };
    printer.onbatterylow = function() {
        console.log('Printer:onbatterylow');
    };
    printer.startMonitor();

}

function getStatusText() {
    var s = 'Status: \n';
    if (status & printer.ASB_NO_RESPONSE) {
        s += ' No printer response\n';
    }
    if (status & printer.ASB_PRINT_SUCCESS) {
        s += ' Print complete\n';
    }
    if (status & printer.ASB_DRAWER_KICK) {
        s += ' Status of the drawer kick number 3 connector pin = "H"\n';
    }
    if (status & printer.ASB_OFF_LINE) {
        s += ' Offline status\n';
    }
    if (status & printer.ASB_COVER_OPEN) {
        s += ' Cover is open\n';
    }
    if (status & printer.ASB_PAPER_FEED) {
        s += ' Paper feed switch is feeding paper\n';
    }
    if (status & printer.ASB_WAIT_ON_LINE) {
        s += ' Waiting for online recovery\n';
    }
    if (status & printer.ASB_PANEL_SWITCH) {
        s += ' Panel switch is ON\n';
    }
    if (status & printer.ASB_MECHANICAL_ERR) {
        s += ' Mechanical error generated\n';
    }
    if (status & printer.ASB_AUTOCUTTER_ERR) {
        s += ' Auto cutter error generated\n';
    }
    if (status & printer.ASB_UNRECOVER_ERR) {
        s += ' Unrecoverable error generated\n';
    }
    if (status & printer.ASB_AUTORECOVER_ERR) {
        s += ' Auto recovery error generated\n';
    }
    if (status & printer.ASB_RECEIPT_NEAR_END) {
        s += ' No paper in the roll paper near end detector\n';
    }
    if (status & printer.ASB_RECEIPT_END) {
        s += ' No paper in the roll paper end detector\n';
    }
    if (status & printer.ASB_BUZZER) {
        s += ' Sounding the buzzer (certain model)\n';
    }
    if (status & printer.ASB_SPOOLER_IS_STOPPED) {
        s += ' Stop the spooler\n';
    }
    return s;
}

// Adds raster image printing
function addImage() {
    try {
        var canvas = document.getElementsByTagName('canvas')[0];
        if (canvas.getContext) {
            var context = canvas.getContext('2d');
            printer.addTextAlign(printer.ALIGN_CENTER);
            printer.brightness = 0.3;
            printer.halftone = printer.HALFTONE_DITHER;
            printer.addImage(canvas.getContext('2d'), 0, 0, canvas.width, canvas.height, printer.COLOR_1, printer.MODE_MONO);
            console.log(canvas.width + '...' + canvas.height);
            //printer.addText('brightness 0.3,  width 562 \n');

            testPrint();
        }
    } catch (e) {
        console.log(e.message);
        //alert(e.message);
    }
}

function testPrint() {
    console.log('testPrint');
    //     printer.addBarcode('12345', printer.BARCODE_CODE39, printer.HRI_BELOW, printer.FONT_A, 2, 32);
    //     printer.addSymbol('http://www.epson.com/', printer.SYMBOL_PDF417_STANDARD, printer.LEVEL_H, 2, 8, 0);

    /*printer.addFeedLine(2);
    printer.addSymbol('http://www.epson.com/', printer.SYMBOL_QRCODE_MODEL_2, printer.LEVEL_DEFAULT, 8, 0, 400);
    printer.addText('GG2-16100005\n');
    printer.addFeedLine(4);
    printer.addText('CUST CLASS               Visitor                \n');
    printer.addText('DATE                     2016-10-18 17:23:22    \n');
    printer.addFeedLine(2);
    printer.addText('CUSTOMER                 Lusifa                 \n');
    printer.addText('                         Tel:852 65451769       \n');
    printer.addFeedLine(1);
    printer.addText('SALES                    Jaydon King            \n');
    printer.addFeedLine(1);
    printer.addText('400 OHEIDA 3PK SPRINGF  9.99 R\n');
    printer.addText('410 3 CUP BLK TEAPOT    9.99 R\n');
    printer.addText('445 EMERIL GRIDDLE/PAN 17.99 R\n');
    printer.addText('438 CANDYMAKER ASSORTCANDYMAKER ASSORTCAN 4.99 R\n');
    printer.addText('474 TRIPOD              8.99 R\n');
    printer.addLogo(32, 60);
    printer.addText('------------------------------\n');
    printer.addText('CASH                    200.00\n');
    printer.addText('CHANGE                   25.19\n');
    printer.addText('------------------------------\n');*/

    printer.addCut(printer.CUT_FEED);
    printer.send();

}
