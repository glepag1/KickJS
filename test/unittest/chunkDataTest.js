requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: 'js/lib',
    //except, if the module ID starts with "kick",
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a ".js" extension since
    //the paths config could be for a directory.
    paths: {
        kick: '../../../../src/js/kick'
    }
});

// Start the main app logic.
requirejs(['kick'],
    function (KICK) {

YUI().use('node', 'console', 'test', function (Y) {

    Y.namespace("KICK.core");

    Y.KICK.core.ChunkDataTest = new Y.Test.Case({

        //name of the test case - if not provided, one is auto-generated
        name : "vec3test",

        //---------------------------------------------------------------------
        // setUp and tearDown methods - optional
        //---------------------------------------------------------------------

        /*
         * Sets up data that is needed by each test.
         */
        setUp : function () {
        },

        /*
         * Cleans up everything that was created by setUp().
         */
        tearDown : function () {
        },

        //---------------------------------------------------------------------
        // Test methods - names must begin with "test"
        //---------------------------------------------------------------------

        testCreateOneChunk : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var uint8Array = new Uint8Array([1,2,3]);
            var float32Array = new Float32Array([1.5,2.5,3.5]);
            chunkData.set(1,uint8Array);
            chunkData.set(2,float32Array);
            var serialized = chunkData.serialize();
            var chunkData2 = new KICK.core.ChunkData();
            chunkData2.deserialize(serialized);
            var uint8Array2 = chunkData2.get(1);
            Assert.isTrue(uint8Array.length == uint8Array2.length);
            for (var i=0;i<uint8Array2.length;i++){
                Assert.isTrue(uint8Array[i].length === uint8Array2[i].length);
            }
            var float32Array2 = chunkData2.get(2);
            Assert.isTrue(float32Array.length == float32Array2.length);
            for (var i=0;i<float32Array.length;i++){
                Assert.isTrue(float32Array[i].length === float32Array2[i].length);
            }
        },
        testUTF8StringASCII : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();

            chunkData.setString(1,"Hello world");
            var res = chunkData.getString(1);
            console.log("Converted string is :'"+res+"'");
            Assert.isTrue("Hello world" === res);
        },
        testUTF8StringUnicode : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var string = "\u00A2";
            chunkData.setString(1,string);
            var res = chunkData.getString(1);
            console.log("Converted string is :'"+res+"'");
            Assert.isTrue(string === res);
        },
        testUTF8StringUnicode2 : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var string = "\u20AC";
            chunkData.setString(1,string);
            var serializedData = chunkData.serialize();
            var chunkData2 = new KICK.core.ChunkData();
            chunkData2.deserialize(serializedData);
            var res = chunkData2.getString(1);
            console.log("Converted string is :'"+res+"'");
            Assert.isTrue(string === res);
        },
        testGetSetNumber : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var value = -3.1415;
            chunkData.setNumber(1,value);
            var serializedData = chunkData.serialize();
            var chunkData2 = new KICK.core.ChunkData();
            chunkData2.deserialize(serializedData);
            var recievedNumber = chunkData2.getNumber(1);
            var diff = recievedNumber - value;
            Assert.isTrue(Math.abs(diff)<0.0001);
        },
        testGetSetArrayBuffer : function () {
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var value = new ArrayBuffer(10);
            var valueView = new Uint8Array(value);
            // set content of array
            for (var i=0;i<valueView.length;i++){
                valueView[i] = i*33;
            }
            chunkData.setArrayBuffer(1,value);
            var serializedData = chunkData.serialize();
            var chunkData2 = new KICK.core.ChunkData();
            chunkData2.deserialize(serializedData);
            var recievedValue = chunkData2.getArrayBuffer(1);
            var recievedValueView = new Uint8Array(recievedValue);
            Assert.isTrue(recievedValue.byteLength === value.byteLength, "Length is not equal");
            // compare content of array

            for (var i=0;i<valueView.length;i++){
                Assert.isTrue(recievedValueView[i]===valueView[i], "Content is not equal");
            }
        },
        testChunkLengthDivBy8 : function () {
            var Assert = Y.Assert;

            var string = "";
            for (var i=0;i<16;i++){
                var chunkData = new KICK.core.ChunkData();
                chunkData.setString(1,string);
                var res = chunkData.getString(1);
                console.log("Converted string is :'"+res+"'");
                Assert.isTrue(string === res);

                // check serialized data is diviable with 8
                var serializedData = chunkData.serialize();
                Assert.isTrue(serializedData.byteLength%8 === 0, "Was "+serializedData.byteLength+" ("+(serializedData.byteLength/8)+")");

                string += "a";
            }
        },
        testPaddingIssue:function(){
            // When declaring a view on the data it must be aligned with the ELEMENT_SIZE.
            // Otherwise a 'INDEX_SIZE_ERR: DOM Exception 1' occurs
            var Assert = Y.Assert;
            var chunkData = new KICK.core.ChunkData();
            var value = new ArrayBuffer(11);
            var valueView = new Uint8Array(value);
            // set content of array
            for (var i=0;i<valueView.length;i++){
                valueView[i] = i*33;
            }
            chunkData.set(1,valueView);
            var valueFloat64 = new ArrayBuffer(8);
            var valueViewFloat64 = new Float64Array(valueFloat64);
            // set content of array
            for (var i=0;i<valueViewFloat64.length;i++){
                valueViewFloat64[i] = i*33;
            }
            chunkData.set(2,valueViewFloat64);

            var serializedData = chunkData.serialize();
            var chunkData2 = new KICK.core.ChunkData();
            chunkData2.deserialize(serializedData);
            var recievedValue = chunkData2.get(1);
            Assert.isTrue(recievedValue.byteLength === valueView.byteLength, "Length is not equal");
            // compare content of array

            for (var i=0;i<valueView.length;i++){
                Assert.isTrue(recievedValue[i]===valueView[i], "Content is not equal");
            }
        }

    });

    var ExampleSuite = new Y.Test.Suite("ChunkData test");
    ExampleSuite.add(Y.KICK.core.ChunkDataTest);

    //create the console
    var r = new Y.Console({
        newestOnTop : false,
        style: 'block', // to anchor in the example content,
        width: 600,
        height: 600
    });

    r.render('#testLogger');

    Y.Test.Runner.add(ExampleSuite);

    //run the tests
    Y.Test.Runner.run();

});
    });