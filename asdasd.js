'use strict';
let mysql = require( 'mysql' );
let dgram = require( 'dgram' );
const EventEmitter = require( 'events' );
let request = require( 'request' );
let md5 = require( 'md5' );
const config = require( "./config_New.js" );
const Helper = require( './Helper' );
const JsonConverter = require( './converter' );
const RemoteTransportServer = config.RemoteTransportServerIP;

let listeningPort = config.HostPort; //8889;
let RemotePort = config.RemotePort; //8888;
let RemoteIP = config.RemoteIP; //"127.0.0.1";
let socket = dgram.createSocket( 'udp4' );
let connection = mysql.createPool( {
    connectionLimit: config.connectionLimit, //10,
    multipleStatements: true,
    host: config.HostIP, //'192.168.0.214',
    user: config.user, //'root',
    password: config.password, //'nopass',
    database: config.database, //'stack_local'

} );

let PushNotificationURL = config.PushNotificationURL;
let toURI_S = {
    user: "",
    host: "",
    port: "",
};
let reqURI_S = {
    user: "",
    host: "",
    port: -1
};
let fromURI_S = {
    user: "",
    host: "",
    port: -1
};
let contactURI_S = {
    user: "",
    host: "",
    port: -1
};
let cSeq = -1;
let cSeqMethod = "";
let callId = "";
let count = 0;
let POPName = config.PopName;
let SIPlocalServerPOrt = 5060;

//==========================================================================//
const SIP_VERSION = "SIP/2.0";
const cSIP_METHOD = {
    INVITE: "INVITE",
    OK: "200 OK",
    UNAUTHORIZED: "Unauthorized",
    FORBIDDEN: "Forbidden",
    REGISTER: "REGISTER",
    ACK: "ACK"

};

const cSIP_CODE = {

};
const cSIP_ATTRIBUTES = {
    TO: "To",
    FROM: "From",
    VIA: "Via",
    C_SEQUENCE: "CSeq",
    CONTACT: "Contact",
    Call_ID: "Call-ID",
    WWW_AUTHENTICATE: "WWW-Authenticate",
    CONTENT_LENGTH: "Content-Length"

};
const DEFAULT_AUTH = '"Digest realm=" acedial.com ",  nonce=" e88df84f1cecs ", algorithm=MD5"';


//==========================================================================//

function myFunc( userEventResp ) {

    let cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );
    Helper.print( "Sending " + cleanJson.Data.headers[ "Request-Line" ] + " at line  87" );
    socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {

        console.log( `Send 403 Forbidden: ${JSON.stringify( cleanJson, null, 4 )}` );

    } );
}

function createRandomToken( size ) {
    let i, r, token = '';
    let base = 32;

    for ( i = 0; i < size; i++ ) {
        r = ( Math.random() * base ) | 0;
        token += r.toString( base );
    }

    return token;
}

class Client extends EventEmitter {
    constructor() {
        super();
        socket.on( 'error', this.OnError );
        socket.on( 'message', this.OnMessage );
        socket.on( 'listening', this.OnListen );
        socket.on( 'disconnect', this.OnDisconnection );
        //socket.bind(listeningPort);

        socket.bind( {
            address: '0.0.0.0',
            port: listeningPort,
            exclusive: true
        } );
    }
    OnDisconnection( err ) {

        Helper.consoleLine();
        console.log( `SipStack socket is disconnected : ${err}` );
        Helper.consoleLine();
        console.log( `SipStack socket is connecting again.` );
        //constructor();
    }
    OnError( err ) {
        Helper.print( `OnError()=> Error in SipStack : ${err}` );
    }
    OnMessage( event, rinfo ) {
        //console.log(`server got: ${event} from ${rinfo.address}:${rinfo.port}`);
        Helper.consoleLine( "Server got a new UDP message" );

        let cleanJson = {};
        event = JSON.stringify( JsonConverter.Convert_TO_Dirty( event ) );
        if ( !event ) {
            Helper.consoleLine( "!event" + event );
            return;
        }

        let EventDataMethod = {};
        try {
            EventDataMethod = Object.assign( {}, JSON.parse( event ) );
        } catch ( loop ) {
            Helper.print( `ERROR in paring object 'event' : ${event}" \n\n catched object : ${loop} ` );
            return;
        }

        let Method = Helper.DeepClone( EventDataMethod[ "Data" ][ "headers" ] );
        if ( Method[ "Request-Line" ] !== null && Method[ "Request-Line" ] !== undefined ) {

            let strng = Method[ "Request-Line" ];
            if ( strng.slice( 0, 8 ) === "REGISTER" ) {
                let userEventResp = Helper.DeepClone( EventDataMethod );
                console.log( "\n\nEventDataMethod.Data.authorization : " + EventDataMethod.Data.authorization )
                try {
                    if ( EventDataMethod.Data.authorization === null || EventDataMethod.Data.authorization === undefined ) {

                        let respSend = 'SIP/2.0 401 Unauthorized' +
                            '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                            '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                            '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                            '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                            '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                            '\r\nWWW-Authenticate: Digest realm="acedial.com", nonce="e88df84f1cec", algorithm=MD5' +
                            '\r\nContent-Length:0\r\n\r\n';

                        //  userEventResp.Data["WWW-Authenticate"]
                        userEventResp.Data[ "WWW-Authenticate" ] = 'Digest realm="acedial.com", nonce="e88df84f1cec", algorithm=MD5'

                        userEventResp.Data.reqURI.user = "";
                        delete userEventResp.Data.headers[ "Request-Line" ];
                        userEventResp.Data.headers[ "Response-Line" ] = "SIP/2.0 401 Unauthorized";
                        userEventResp.Data.rawMsg = respSend;

                        Helper.print( "  SIP/2.0 401 Unauthorized at line 192" );
                        try {

                            cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );

                        } catch ( deepCloneError ) {
                            Helper.consoleLine( "Error in deep cloning" );
                            Helper.print( "Line 183 : " + deepCloneError );
                        }



                        socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {
                            if ( err ) {
                                Helper.print( `Error in sending 401 Unauthorized to : ${EventDataMethod.Data.headers["To"]}` );
                                Helper.print( "Due to" + err );
                            }
                        } );
                    } else if ( EventDataMethod.Data.authorization.username !== null ) {

                        let userEventResp = Helper.DeepClone( EventDataMethod );
                        let _data = Helper.DeepClone( EventDataMethod.Data );

                        let expires = 3600;
                        if ( EventDataMethod.Data[ "Expires" ] !== undefined ) {
                            expires = EventDataMethod.Data[ "Expires" ];
                        }

                        let v_SIPMessages = {};
                        let v_ReturnCode = {};
                        let v_SendWaitingInviteGlobal = {};
                        try {
                            connection.getConnection( function ( err, connection_local ) {

                                if ( err ) {
                                    ;
                                    Helper.print( err );
                                    return;
                                }


                                Helper.consoleLine( "Error in creating connection with database" );
                                Helper.consoleLine( "EventDataMethod.Data.authorization[ username ] + " + EventDataMethod.Data.authorization )



                                console.log( "hahahah" + EventDataMethod.Data.authorization );
                                //console.log("hahahah"+EventDataMethod.Data.authorization);
                                //var Authorization = 'Digest realm="acedial.com", nonce="e88df84f1cec", algorithm=MD5';
                                var Authorization = EventDataMethod.Data.authorization
                                console.log( "\n", "Authorization:", "\n", Authorization )

                                console.log( "\n", "EventDataMethod.Data.authorization:", "\n", EventDataMethod.Data.authorization )
                                var Authorization_Split = Authorization.split( ',' );
                                console.log( "\n", "Authorization_Split:", "\n", Authorization_Split )

                                let Digestusername = Authorization_Split[ 0 ].split( '=' )
                                Digestusername = Digestusername[ 1 ]
                                Digestusername = Digestusername.replace( '"', '' )
                                Digestusername = Digestusername.replace( '"', '' )
                                console.log( "\n", " Digestusername:", Digestusername )

                                let realm = Authorization_Split[ 1 ].split( '=' )
                                realm = realm[ 1 ].replace( '"', '' ).replace( '"', '' )

                                console.log( "\n", " realm:", realm )

                                let nonce = Authorization_Split[ 2 ].split( '=' )

                                nonce = nonce[ 1 ].replace( '"', '' ).replace( '"', '' )

                                console.log( "\n", " nonce:", nonce )

                                let uri = Authorization_Split[ 3 ].split( '=' )

                                uri = uri[ 1 ].replace( '"', '' ).replace( '"', '' )
                                console.log( "\n", " uri:", uri )
                                let response = Authorization_Split[ 4 ].split( '=' )
                                response = response[ 1 ]
                                response = response.replace( '"', '' ).replace( '"', '' )
                                console.log( "\n", " response:", response )
                                let algorithm = Authorization_Split[ 5 ].split( '=' )
                                algorithm = algorithm[ 1 ]
                                algorithm = algorithm.replace( '"', '' ).replace( '"', '' )

                                console.log( "\n", " algorithm:", algorithm )



                                console.log( "\n", " EventDataMethod:", EventDataMethod )

                                let sql_TX = 'Call Proc_SIPRegisterRequestHandler("' + EventDataMethod.RemoteIP + '","' + EventDataMethod.RemotePort +
                                    '","' + EventDataMethod.LocalIP + '","' + EventDataMethod.LocalPort + '","' + EventDataMethod.Data.callID +
                                    '","' + Digestusername + '","' + realm +
                                    '","' + uri + '","' + nonce +
                                    '","' + response + '","' + algorithm +
                                    '","' + expires + '","' + EventDataMethod.Data.contactURI[ "user" ] +
                                    '","' + EventDataMethod.Data.contactURI[ "host" ] + '","' + EventDataMethod.Data.contactURI[ "port" ] +
                                    '",@v_SIPMessages, @v_SendWaitingInvite, @v_ReturnCode);' +
                                    'SELECT @v_SIPMessages, @v_SendWaitingInvite, @v_ReturnCode;';

                                try {
                                    connection_local.query( sql_TX, function ( err, Result_TX ) {

                                        if ( err ) {
                                            Helper.consoleLine( "Error in executing query" );
                                            Helper.print( sql_TX );
                                            Helper.print( err );
                                            return;
                                        }

                                        try {

                                            v_SIPMessages = JSON.parse( Result_TX[ 1 ][ 0 ][ '@v_SIPMessages' ] );
                                            v_ReturnCode = ( Result_TX[ 1 ][ 0 ][ '@v_ReturnCode' ] );
                                            v_SendWaitingInviteGlobal = ( Result_TX[ 1 ][ 0 ][ '@v_SendWaitingInvite' ] );

                                        } catch ( e ) {
                                            console.error( "ERROR : " + e );
                                            return;
                                        }

                                        if ( v_ReturnCode === 0 ) {
                                            /*************************************************vvv Relaying All Ack except 486 and 487 status code*************************************************************/
                                            try {

                                                let respSend = 'SIP/2.0 200 OK' +
                                                    '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                                                    '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                                                    '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                                                    '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                                                    '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                                                    '\r\nContact: ' + EventDataMethod.Data.headers[ "Contact" ] +
                                                    '\r\nContent-Length:0\r\n\r\n';

                                                userEventResp.Data.reqURI.user = "";

                                                delete userEventResp.Data.headers[ "Request-Line" ];

                                                userEventResp.Data.headers[ "Response-Line" ] = "SIP/2.0 200 OK";

                                                userEventResp.Data.rawMsg = respSend;
                                                Helper.print( "userEventResp : " + JSON.stringify( userEventResp ) );

                                                cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );

                                                Helper.print( "Sending SIP/2.0 200 OK at line 274" );
                                                socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                                    ( err, bytes ) => {
                                                        console.log( `Send 200 OK: ${JSON.stringify( cleanJson, null, 4 )}` );
                                                    }
                                                );
                                                if ( v_SendWaitingInviteGlobal == 1 ) {

                                                }
                                            } catch ( loop ) {
                                                return console.error( "ERROR : Loop->" + loop );
                                            }
                                            let SendInviteQuery = 'SELECT InviteJSONString FROM tblsbcchannels WHERE ToURIUser="' + EventDataMethod.Data.contactURI[ "user" ] + '" AND ChannelState="Connecting" AND IncomingOrOutgoing = "Outgoing"  AND InviteTime>=NOW() - INTERVAL 30 SECOND ORDER BY InsertTime DESC LIMIT 1';

                                            connection_local.query( SendInviteQuery, function ( err, Result_TX1 ) {

                                                if ( err ) {
                                                    Helper.consoleLine( "Error in executing query" );
                                                    Helper.print( SendInviteQuery );
                                                    Helper.print( err );
                                                    return;
                                                }
                                                try {
                                                    Helper.consoleLine();
                                                    console.log( "DB response => ", Result_TX1 );

                                                    if ( Result_TX1.length !== 0 ) {

                                                        if ( Result_TX1[ 0 ] !== undefined ) {
                                                            let InviteResult = ( Result_TX1[ 0 ][ "InviteJSONString" ] );
                                                            InviteResult = InviteResult.replace( /\n/g, "\\n" ).replace( /\r/g, "\\r" ); //.replace('\"','\\\"');
                                                            Helper.print( InviteResult );
                                                            try {
                                                                v_SIPMessages = JSON.parse( InviteResult );

                                                            } catch ( e ) {
                                                                console.log( "error in parsing =>> " + e )
                                                            }
                                                            v_SIPMessages.Data.toURI.host = EventDataMethod.RemoteIP;
                                                            v_SIPMessages.Data.toURI.port = EventDataMethod.RemotePort;

                                                            if ( v_SIPMessages !== null || v_SIPMessages !== undefined ) {


                                                                cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( v_SIPMessages ) );

                                                                Helper.print( "Sending InviteJSONString at line 319" );
                                                                socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                                                    ( err, bytes ) => {
                                                                        console.log( `Send Invite On Register: ${JSON.stringify( cleanJson, null, 4 )}` );

                                                                    }
                                                                );
                                                            }
                                                        }

                                                    }
                                                } catch ( e ) {
                                                    return console.error( "ERROR=========>> : " + e );
                                                }
                                            } );
                                            /*************************************************^^^ Relaying All Ack except 486 and 487 status code*************************************************************/
                                        } else {

                                            Helper.print( sql_TX );
                                            Helper.print( "v_ReturnCode : " + v_ReturnCode );

                                            let respSend = 'SIP/2.0 401 Unauthorized' +
                                                '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                                                '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                                                '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                                                '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                                                '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                                                '\r\nWWW-Authenticate: Digest realm="acedial.com",  nonce="e88df84f1cecs", algorithm=MD5' +
                                                '\r\nContent-Length:0\r\n\r\n';
                                            userEventResp.Data.reqURI.user = "";

                                            delete userEventResp.Data.headers[ "Request-Line" ];
                                            userEventResp.Data.headers[ "Response-Line" ] = "SIP/2.0 401 Unauthorized";

                                            userEventResp.Data.rawMsg = respSend;

                                            cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );

                                            Helper.print( "Sending 401 Unauthorized as line 353" );
                                            socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {
                                                //console.log(`Send 401 Unauthorized: ${JSON.stringify(userEventResp, null, 4)}`);
                                            } );

                                        }
                                    } );


                                } catch ( qryError ) {
                                    return console.error( "ERROR : in qryError " + qryError );
                                }
                                connection_local.release();
                            } );
                        } catch ( db ) {
                            return console.error( "ERROR : in DB " + db );
                        }

                    } else {
                        console.log( '\n\nUn known Authenticaton Method\n==========================================================\n\n' );
                    }
                } catch ( qryError ) {
                    return console.error( "ERROR : in Message 361 : " + qryError );
                }
            } else if ( strng.slice( 0, 6 ) === "INVITE" ) {
                let userEventResp = Helper.DeepClone( EventDataMethod ); //{};
                let _data = Helper.DeepClone( EventDataMethod.Data );
                let callLegA = EventDataMethod.Data[ "callID" ];

                let localTransport = {};
                localTransport.host = EventDataMethod.LocalIP;
                localTransport.port = EventDataMethod.LocalPort;

                let remoteTransport = {};
                remoteTransport.host = EventDataMethod.RemoteIP;
                remoteTransport.port = EventDataMethod.RemotePort;

                let MappingChannels = {};
                MappingChannels = _data.MappingChannels; //"MappingC-" + (Math.random().toString());
                let reqURI = {};
                reqURI.user = _data.reqURI.user;
                reqURI.host = _data.reqURI.host;
                reqURI.port = _data.reqURI.port;
                let cSeq = _data.cSeq;
                let cSeqMethod = _data.cSeqMethod;

                let fromURI = {};
                fromURI.user = _data.fromURI.user;
                fromURI.host = _data.fromURI.host;
                fromURI.port = _data.fromURI.port;
                let userEvent = Helper.DeepClone( EventDataMethod );
                let IngressSessionID = _data.headers[ "Ingress-Session-ID" ];
                let data = _data;
                count = ( count + 1 ) % 100;
                this.sessionKey = Math.random().toString().substring( 2, 20 ) + count;
                data.callID = this.sessionKey;
                data.reqURI = reqURI;
                data.fromURI = fromURI;
                data.payloadSDP = _data.payloadSDP;
                let contactURI = _data.contactURI;
                let callLegB = this.sessionKey;

                try {
                    connection.getConnection( function ( err, connection_local ) {
                        if ( err ) {
                            Helper.consoleLine( "Error in creating connection with database" );
                            Helper.print( err );
                            return;
                        }


                        let sql_TX = 'Call TX_SIPSBCInvite("SIP.Invite.Received","' + localTransport.host + '","' +
                            localTransport.port + '","' + remoteTransport.host + '","' + remoteTransport.port + '","' +
                            callLegA + '","' + EventDataMethod.Data.viaURI.branch + '","' + EventDataMethod.Data.viaURI.host + '","' + EventDataMethod.Data.viaURI.port + '","' + cSeq + '","' + cSeqMethod + '","' + reqURI.user + '","' + reqURI.host + '","' +
                            reqURI.port + '","' + data.toURI.user + '","' + data.toURI.host + '","' + _data.toURI.port + '","' +
                            fromURI.user + '","' + fromURI.host + '","' + fromURI.port + '","' + fromURI.user /*contactURI.user*/ + '","' + remoteTransport.host /*contactURI.host*/ + '","' +
                            remoteTransport.port /*contactURI.port*/ + '","' + IngressSessionID + '","v_SIPUserAgent",20,4,"0","' + /*trnsfrmSdptransform.parse(*/ _data.payloadSDP /*)*/ + '",\'' + ( JSON.stringify( _data.headers ).replace( /\\"/g, '\\\\"' ) ) + '\',"' + ( _data.rawMsg ).toString().replace( /"/g, '\\"' ) + '","' +
                            callLegB + '",10000,100000,0,"' + POPName + '",@v_RequestURIUser, @v_RequestURIHost, @v_RequestURIPort, @v_ToURIUser, @v_ToURIHost,' +
                            ' @v_ToURIPort, @v_FromURIUser, @v_FromURIHost, @v_FromURIPort, @v_ContactURIUser, @v_ContactURIHost, @v_ContactURIPort,@v_OutgoingViaBranch, @v_OutgoingViaURIHost, @v_OutgoingViaURIPort,' +
                            '@v_CallLegID,@v_PayloadSDP, @v_PeeringSBCIPAddress, @v_PeeringSBCPort, @v_ServiceCodeName,@v_SessionID, @v_SIPResponse,@v_SIPSendPushNotify, @v_ReturnCode);' +
                            'SELECT @v_RequestURIUser, @v_RequestURIHost, @v_RequestURIPort, @v_ToURIUser, @v_ToURIHost, @v_ToURIPort, @v_FromURIUser,' +
                            '@v_FromURIHost, @v_FromURIPort, @v_ContactURIUser, @v_ContactURIHost, @v_ContactURIPort,@v_OutgoingViaBranch, @v_OutgoingViaURIHost, @v_OutgoingViaURIPort,@v_CallLegID, @v_PayloadSDP, @v_PeeringSBCIPAddress,' +
                            '@v_PeeringSBCPort, @v_ServiceCodeName ,@v_SessionID,@v_SIPResponse, @v_SIPSendPushNotify, @v_ReturnCode;';


                        try {
                            connection_local.query( sql_TX, function ( err, Result_TX ) {
                                if ( err ) {
                                    Helper.consoleLine( "Error in executing query" );
                                    Helper.print( sql_TX );
                                    Helper.print( err );
                                    return;
                                }

                                let v_RequestURIUser = ( Result_TX[ 1 ][ 0 ][ '@v_RequestURIUser' ] );
                                let v_RequestURIHost = ( Result_TX[ 1 ][ 0 ][ '@v_RequestURIHost' ] );
                                let v_RequestURIPort = ( Result_TX[ 1 ][ 0 ][ '@v_RequestURIPort' ] );
                                let v_ToURIUser = ( Result_TX[ 1 ][ 0 ][ '@v_ToURIUser' ] );
                                let v_ToURIHost = ( Result_TX[ 1 ][ 0 ][ '@v_ToURIHost' ] );
                                let v_ToURIPort = ( Result_TX[ 1 ][ 0 ][ '@v_ToURIPort' ] );
                                let v_FromURIUser = ( Result_TX[ 1 ][ 0 ][ '@v_FromURIUser' ] );
                                let v_FromURIHost = ( Result_TX[ 1 ][ 0 ][ '@v_FromURIHost' ] );
                                let v_FromURIPort = ( Result_TX[ 1 ][ 0 ][ '@v_FromURIPort' ] );
                                let v_ContactURIUser = ( Result_TX[ 1 ][ 0 ][ '@v_ContactURIUser' ] );
                                let v_ContactURIHost = ( Result_TX[ 1 ][ 0 ][ '@v_ContactURIHost' ] );
                                let v_ContactURIPort = ( Result_TX[ 1 ][ 0 ][ '@v_ContactURIPort' ] );
                                let v_OutgoingViaBranch = ( Result_TX[ 1 ][ 0 ][ '@v_OutgoingViaBranch' ] );
                                let v_OutgoingViaURIHost = ( Result_TX[ 1 ][ 0 ][ '@v_OutgoingViaURIHost' ] );
                                let v_OutgoingViaURIPort = ( Result_TX[ 1 ][ 0 ][ '@v_OutgoingViaURIPort' ] );
                                let v_CallLegID = ( Result_TX[ 1 ][ 0 ][ '@v_CallLegID' ] );
                                let v_PayloadSDP = ( Result_TX[ 1 ][ 0 ][ '@v_PayloadSDP' ] );
                                let v_PeeringSBCIPAddress = ( Result_TX[ 1 ][ 0 ][ '@v_PeeringSBCIPAddress' ] );
                                let v_PeeringSBCPort = ( Result_TX[ 1 ][ 0 ][ '@v_PeeringSBCPort' ] );
                                let v_ServiceCodeName = ( Result_TX[ 1 ][ 0 ][ '@v_ServiceCodeName' ] );
                                let v_SessionID = ( Result_TX[ 1 ][ 0 ][ '@v_SessionID' ] );
                                let v_SIPResponse = ( Result_TX[ 1 ][ 0 ][ '@v_SIPResponse' ] );
                                let v_SIPSendPushNotify = ( Result_TX[ 1 ][ 0 ][ '@v_SIPSendPushNotify' ] );
                                let v_ReturnCode = ( Result_TX[ 1 ][ 0 ][ '@v_ReturnCode' ] );


                                console.log( "v_ReturnCode \n " + ( v_ReturnCode ) );
                                console.log( "v_SIPSendPushNotify \n " + ( v_SIPSendPushNotify ) );

                                toURI_S.user = v_ToURIUser;
                                toURI_S.host = v_ToURIHost;
                                toURI_S.port = parseInt( v_ToURIPort );

                                reqURI_S.user = v_RequestURIUser || '';
                                reqURI_S.host = v_RequestURIHost || '';
                                reqURI_S.port = parseInt( v_RequestURIPort || '5061' );

                                fromURI_S.user = v_FromURIUser || '';
                                fromURI_S.host = v_FromURIHost || '';
                                fromURI_S.port = parseInt( v_FromURIPort || '5061' );

                                contactURI_S.user = v_ContactURIUser || '';
                                contactURI_S.host = v_ContactURIHost || '';
                                contactURI_S.port = SIPlocalServerPOrt; //parseInt(v_ContactURIPort || '5061');
                                //let VIA=EventDataMethod.Data.headers["Via"];

                                let viaURI = Helper.DeepClone( EventDataMethod.Data.viaURI );
                                viaURI.branch = v_OutgoingViaBranch || 'z9hG4bK9999999999999999';
                                viaURI.host = v_OutgoingViaURIHost || "172.16.6.133";
                                viaURI.port = SIPlocalServerPOrt; //v_OutgoingViaURIPort || 5060;
                                data.callID = v_CallLegID || '999999999999999999999955555';
                                data.reqURI = reqURI_S;
                                data.fromURI = fromURI_S;
                                data.toURI = toURI_S;
                                data.viaURI = viaURI;
                                data.contactURI = contactURI_S;

                                data.payloadSDP = v_PayloadSDP;
                                userEvent.RemoteIP = reqURI_S.host || '127.0.0.1';
                                userEvent.RemotePort = reqURI_S.port || '5061';
                                userEvent.Data = data;

                                let InviteTOSendonPUSHNotify = JSON.stringify( userEvent );
                                InviteTOSendonPUSHNotify = InviteTOSendonPUSHNotify.replace( /\"/g, '\\"' );


                                let sql_update = 'UPDATE tblsbcchannels SET InviteJSONString = \'' + InviteTOSendonPUSHNotify + '\' WHERE SbcSessionID=' + v_SessionID + ' AND IncomingOrOutgoing = "Outgoing"';

                                try {
                                    connection_local.query( sql_update, function ( err, Result_TX ) {

                                        if ( err ) {
                                            Helper.consoleLine( "Error in executing query" );
                                            Helper.print( sql_update );
                                            Helper.print( err );
                                            return;
                                        }
                                    } );
                                } catch ( qryError ) {
                                    return console.error( "ERROR : in qryError " + qryError );
                                }

                                if ( v_SIPSendPushNotify !== 1 ) {
                                    if ( v_ReturnCode === 0 ) {

                                        cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEvent ) );

                                        Helper.print( "Sending 401 Unauthorized as line 535" );
                                        socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                            ( err, bytes ) => {
                                                console.log( `Send Invite: ${JSON.stringify(cleanJson, null, 4)}` );
                                            }
                                        );
                                    } else {

                                        let respSend = 'SIP/2.0 ' + v_SIPResponse + //'SIP/2.0 403 Forbidden' +
                                            '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                                            '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                                            '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                                            '\r\nCall-ID:' + callLegA +
                                            '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                                            '\r\nServer: Node Script' +
                                            '\r\nAllow:' + EventDataMethod.Data.headers[ "Allow" ] +
                                            '\r\nSupported:' + EventDataMethod.Data.headers[ "Supported" ] +
                                            '\r\nContent-Length:0\r\n\r\n';

                                        userEventResp.Data.reqURI.user = "";
                                        userEventResp.RemoteIP = EventDataMethod.RemoteIP;
                                        userEventResp.RemotePort = EventDataMethod.RemotePort;
                                        userEventResp.Data.callID = callLegA;
                                        userEventResp.Data.statusCode = 403;
                                        userEventResp.Data.rawMsg = respSend;

                                        delete userEventResp.Data.headers[ "Request-Line" ];
                                        userEventResp.Data.headers[ "Response-Line" ] = "SIP/2.0 200 OK";

                                        Helper.print( "Send 403 Forbidden at line 562" );
                                        cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );
                                        socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                            ( err, bytes ) => {
                                                console.log( `Send 403 Forbidden: ${JSON.stringify( cleanJson, null, 4 )}` );
                                            }
                                        );

                                    }
                                } else {

                                    let respSend = 'SIP/2.0 403 Forbidden' +
                                        '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                                        '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                                        '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                                        '\r\nCall-ID:' + callLegA +
                                        '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                                        '\r\nServer: Node Script' +
                                        '\r\nAllow:' + EventDataMethod.Data.headers[ "Allow" ] +
                                        '\r\nSupported:' + EventDataMethod.Data.headers[ "Supported" ] +
                                        '\r\nContent-Length:0\r\n\r\n';

                                    userEventResp.Data.reqURI.user = "";
                                    userEventResp.RemoteIP = EventDataMethod.RemoteIP;
                                    userEventResp.RemotePort = EventDataMethod.RemotePort;
                                    userEventResp.Data.callID = callLegA;
                                    userEventResp.Data.statusCode = 403;
                                    userEventResp.Data.rawMsg = respSend;
                                    let pushRequest = {
                                        url: PushNotificationURL,
                                        form: {
                                            "Query": {
                                                'PublicIdentity': EventDataMethod.Data.toURI.user
                                            }
                                        }
                                    };

                                    request.post( pushRequest, function ( err, httpResponse, body ) {
                                        if ( err ) {
                                            Helper.consoleLine( "Getting error while sending push notification" );
                                            Helper.print( JSON.stringify( pushRequest ) )
                                            Helper.print( err );
                                        } else {
                                            Helper.consoleLine( "Push notifcation response" );
                                            Helper.print( JSON.stringify( httpResponse ) );
                                            Helper.print( body );
                                        }

                                    } );
                                }

                            } );
                        } catch ( qryError ) {
                            return console.error( "ERROR : in qryError " + qryError );
                        }
                        connection_local.release();
                    } );
                } catch ( db ) {
                    return console.error( "ERROR : in DB " + db );
                }
            } else if ( strng.slice( 0, 3 ) === "ACK" || strng.slice( 0, 3 ) === "BYE" || strng.slice( 0, 6 ) === "CANCEL" ) {
                let _data = Helper.DeepClone( EventDataMethod.Data );
                let cSeq = _data.cSeq;
                let v_ContactURIHost = _data.contactURI.host;
                let v_ContactURIPort = _data.contactURI.port;
                let cSeqMethod = _data.cSeqMethod;
                let statusCode = _data.statusCode;
                let v_PayloadSDP = {};
                let v_SIPHeaders = {};
                let v_SIPMessages = {};
                let v_ReturnCode = {};
                let v_MessageType = "";
                if ( strng.slice( 0, 3 ) === "ACK" ) {
                    v_MessageType = "SIP.Ack.Received";
                } else if ( strng.slice( 0, 3 ) === "BYE" ) {
                    v_MessageType = "SIP.Bye.Received";
                } else if ( strng.slice( 0, 6 ) === "CANCEL" ) {
                    v_MessageType = "SIP.Cancel.Received";
                }

                try {
                    connection.getConnection( function ( err, connection_local ) {

                        if ( err ) {
                            Helper.consoleLine( "Error in creating connection with database" );
                            Helper.print( err );
                            return;
                        }

                        let sql_TX = 'Call TX_SIPEventHandler("' + v_MessageType + '",\'' + ( JSON.stringify( _data.headers ).replace( /\\"/g, '\\\\"' ) ) + '\',"' + _data.callID + '","' +
                            _data.viaURI.branch + '","' + _data.statusCode + '","' + cSeq + '","' + cSeqMethod + '","' + v_ContactURIHost + '","' + v_ContactURIPort + '","' +
                            _data.payloadSDP + '",\'' + ( _data.rawMsg ).toString().replace( /\"/g, '\\\\"' ) + '\',"' + POPName + '",@v_PayloadSDP,@v_SIPHeaders,@v_SIPMessages, @v_ReturnCode);' +
                            'SELECT @v_PayloadSDP,@v_SIPHeaders,@v_SIPMessages, @v_ReturnCode;';
                        //                        console.log("===================================\n\n\n\n\n\n\n\n" + sql_TX);
                        try {
                            connection_local.query( sql_TX, function ( err, Result_TX ) {
                                if ( err ) {
                                    Helper.consoleLine( "Error in executing query" );
                                    Helper.print( sql_TX );
                                    Helper.print( err );
                                    return;
                                }

                                if ( err )
                                    console.log( '"SIP.Ack.Received-Error"\n\n\n\n\n\n\n\n=====================================================================================================Error while performing Query.' + err );

                                try {

                                    v_SIPMessages = JSON.parse( Result_TX[ 1 ][ 0 ][ '@v_SIPMessages' ] );
                                    v_ReturnCode = ( Result_TX[ 1 ][ 0 ][ '@v_ReturnCode' ] );
                                } catch ( e ) {
                                    return console.error( "ERROR : " + e );
                                }

                                if ( v_ReturnCode === 0 ) {
                                    /*************************************************vvv Relaying All Ack except 486 and 487 status code*************************************************************/

                                    try {
                                        if ( v_SIPMessages.length > 0 ) {
                                            for ( let i = 0; i < v_SIPMessages.length; i++ ) {
                                                //console.log(`Send 180: ${JSON.stringify(v_SIPMessages[i])}`);
                                                cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( v_SIPMessages[ i ] ) );

                                                Helper.print( "Sending Ack at line 685" );
                                                socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                                    ( err, bytes ) => {
                                                        console.log( `Send ${v_MessageType}: ${JSON.stringify( cleanJson, null, 4 )}` );
                                                    }
                                                );
                                            }
                                        }
                                    } catch ( loop ) {
                                        return console.error( "ERROR : Loop->" + loop );
                                    }

                                    /*************************************************^^^ Relaying All Ack except 486 and 487 status code*************************************************************/
                                } else {

                                    Helper.consoleLine( "Call ID dosen't exist" );
                                    Helper.print( sql_TX );
                                    Helper.print( "With return code : " + v_ReturnCode );

                                }
                            } );
                        } catch ( qryError ) {
                            return console.error( "ERROR : in qryError " + qryError );
                        }
                        connection_local.release();
                    } );
                } catch ( db ) {
                    return console.error( "ERROR : in DB " + db );
                }
            } else if ( strng.slice( 0, 7 ) === "OPTIONS" || strng.slice( 0, 9 ) === "SUBSCRIBE" || strng.slice( 0, 7 ) === "PUBLISH" || strng.slice( 0, 6 ) === "NOTIFY" ) {
                let _data = Helper.DeepClone( EventDataMethod.Data );
                let cSeq = _data.cSeq;
                let cSeqMethod = _data.cSeqMethod;
                let statusCode = _data.statusCode;
                let v_PayloadSDP = {};
                let v_SIPHeaders = {};
                let v_SIPMessages = {};
                let v_ReturnCode = {};
                try {
                    let userEventResp = Helper.DeepClone( EventDataMethod );
                    let respSend = "";
                    if ( userEventResp.Data.headers[ "Content-Length" ] === "0" ) {

                        respSend = 'SIP/2.0 200 OK' +
                            '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                            '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] + '>' +
                            '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                            '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                            '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                            '\r\nContact: sip:acedial@95.216.190.209:' + SIPlocalServerPOrt +
                            '\r\nContent-Length:0\r\n\r\n';

                    } else {
                        respSend = 'SIP/2.0 200 OK' +
                            '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                            '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] + '>' +
                            '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                            '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                            '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                            '\r\nContact: sip:acedial@95.216.190.209:' + SIPlocalServerPOrt +
                            '\r\nContent-Length:' + EventDataMethod.Data.headers[ "Content-Length" ] + '\r\n\r\n' +
                            EventDataMethod.Data.payloadSDP;
                    }
                    userEventResp.RemoteIP = EventDataMethod.RemoteIP;
                    userEventResp.RemotePort = EventDataMethod.RemotePort;
                    userEventResp.Data.reqURI.user = "";
                    userEventResp.Data.statusCode = 200;
                    userEventResp.Data.rawMsg = respSend;
                    userEventResp.Data.contactURI.host = "95.216.190.209";
                    userEventResp.Data.contactURI.port = SIPlocalServerPOrt;

                    delete userEventResp.Data.headers[ "Request-Line" ];

                    userEventResp.Data.headers[ "Response-Line" ] = "SIP/2.0 200 OK";

                    cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );

                    Helper.print( "Sending SIP/2.0 200 OK at line 758" );
                    socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {
                        //console.log(`Send OPTIONS: ${JSON.stringify(userEventResp, null, 4)}`);
                    } );

                } catch ( db ) {
                    return console.error( "ERROR : in Message 743 : " + db );
                }
            } else {
                console.log( `\nUn Recongnized Request-Line Messages ${strng}` );
            }
        } else if ( Method[ "Response-Line" ] !== null && Method[ "Response-Line" ] !== undefined ) {
            // console.log(`we get Response-line from ${Method["Response-Line"]}`);
            let strng = Method[ "Response-Line" ];
            if ( strng.slice( 0, 24 ) === "SIP/2.0 401 Unauthorized" && EventDataMethod.Data.cSeqMethod === "REGISTER" ) {

                cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( event ) );

                Helper.print( "Sending " + strng + " at line 778" );

                socket.send( Buffer.from( cleanJson ), 8890, "127.0.0.1", ( err, bytes ) => {
                    console.log( `Send Genaric: ${cleanJson}` );
                } );
            } else if ( ( strng.slice( 0, 24 ) === "SIP/2.0 401 Unauthorized" || ( strng.slice( 0, 11 ) === "SIP/2.0 407" ) ) && EventDataMethod.Data.cSeqMethod === "INVITE" ) {
                try {
                    connection.getConnection( function ( err, connection_local ) {

                        if ( err ) {
                            Helper.consoleLine( "Error in creating connection with database" );
                            Helper.print( err );
                            return;
                        }

                        let SendInviteQuery = 'SELECT InviteJSONString FROM tblsbcchannels WHERE CallLegID="' + EventDataMethod.Data.callID + '"';
                        // console.log("===================================\n\n\n\n\n\n\n\n" + SendInviteQuery);
                        try {

                            connection_local.query( SendInviteQuery, function ( err, Result_TX1 ) {
                                if ( err ) {
                                    Helper.consoleLine( "Error in executing query" );
                                    Helper.print( SendInviteQuery );
                                    Helper.print( err );
                                    return;
                                }

                                try {
                                    if ( Result_TX1.length !== 0 ) {
                                        if ( Result_TX1[ 0 ] !== undefined ) {
                                            let authHeaders = Helper.DeepClone( EventDataMethod.Data.headers[ "WWW-Authenticate" ] );
                                            let arr = authHeaders.split( ',' );
                                            let realm = ( arr[ 0 ].split( '=' )[ 1 ] ).replace( /"/g, "" );
                                            let nonce = ( arr[ 1 ].split( '=' )[ 1 ] ).replace( /"/g, "" );
                                            let _cnonce = createRandomToken( 12 );
                                            let Viabranch = "z9hG4bKP" + _cnonce;
                                            let qop = null;
                                            if ( Boolean( arr[ 2 ] ) ) {
                                                qop = ( arr[ 2 ].split( '=' )[ 1 ] ).replace( /"/g, "" );
                                            }
                                            /* Ack of 401 or 407 */
                                            let Ack_message = 'ACK sip:' + EventDataMethod.Data.toURI.user + ' SIP/2.0' +
                                                '\r\nVia:' + EventDataMethod.Data.headers[ "Via" ] +
                                                '\r\nFrom:' + EventDataMethod.Data.headers[ "From" ] +
                                                '\r\nTo:' + EventDataMethod.Data.headers[ "To" ] +
                                                '\r\nCall-ID:' + EventDataMethod.Data.headers[ "Call-ID" ] +
                                                '\r\nCSeq:' + EventDataMethod.Data.headers[ "CSeq" ] +
                                                '\r\nContent-Length:0\r\n\r\n';

                                            EventDataMethod.Data.rawMsg = Ack_message;
                                            if ( EventDataMethod !== null || EventDataMethod !== undefined ) {
                                                userEventResp.Data.headers[ "Request-Line" ] = 'ACK sip:' + EventDataMethod.Data.toURI.user + ' SIP/2.0';

                                                cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( userEventResp ) );

                                                Helper.print( "Sending ACK sip:" + EventDataMethod.Data.toURI.user + " SIP/2.0 " + " at line 832" );
                                                socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                                    ( err, bytes ) => {
                                                        if ( bytes > 0 ) {
                                                            // console.log(`Send Invite On Invite: ${JSON.stringify(EventDataMethod, null, 4)}`);
                                                        }
                                                    }
                                                );
                                            }
                                            /* Ack of 401 or 407 */
                                            /* Invite with Authorization */
                                            let InviteResult = Result_TX1[ 0 ][ "InviteJSONString" ];
                                            InviteResult = InviteResult.replace( /\n/g, "\\n" ).replace( /\r/g, "\\r" );
                                            console.log( InviteResult );
                                            let v_SIPMessages = {};
                                            try {
                                                v_SIPMessages = JSON.parse( InviteResult );
                                            } catch ( e ) {
                                                Helper.consoleLine( "Error in object parsing" );
                                                Helper.print( InviteResult );
                                                Helper.print( e );
                                                return;
                                            }
                                            let method = 'INVITE';
                                            console.log( ( arr[ 1 ].split( '=' )[ 1 ] ).replace( /"/g, "" ) );
                                            if ( qop === 'auth' ) {
                                                let _nc = '0000000' + counter;
                                                const hex = Number( _nc ).toString( 16 );
                                                let _ncHex = '00000000';
                                                _ncHex = '00000000'.substr( 0, 8 - hex.length ) + hex;
                                                let HA1 = md5( v_SIPMessages.Data.fromURI.user + ':' + realm + ':' + 'Test2000' );
                                                let HA2 = md5( method + ':' + 'sip:' + RemoteTransportServer );
                                                let calResponse = md5( HA1 + ':' + nonce + ':' + _ncHex + ':' + _cnonce + ':auth:' + HA2 );
                                                let Invite_message = v_SIPMessages.Data.headers[ "Request-Line" ] + '\r\n' +
                                                    'Via: ' + v_SIPMessages.Data.headers[ "Via" ] + '\r\n' +
                                                    'From: ' + v_SIPMessages.Data.headers[ "From" ] + '\r\n' +
                                                    'To: ' + v_SIPMessages.Data.headers[ "To" ] + '\r\n' +
                                                    'Call-ID: ' + v_SIPMessages.Data.headers[ "Call-ID" ] + '\r\n' +
                                                    'CSeq: ' + v_SIPMessages.Data.cSeq + ' ' + v_SIPMessages.Data.cSeqMethod + '\r\n' +
                                                    'Contact: ' + v_SIPMessages.Data.headers[ "Contact" ] + '\r\n' +
                                                    'Authorization: Digest username=\"' + v_SIPMessages.Data.fromURI.user + '\",realm=\"' + realm + '\",nonce=\"' + nonce + '\",uri=\"sip:' + RemoteTransportServer + '\",response=\"' + calResponse + '\",' +
                                                    'cnonce="' + _cnonce + '",nc=' + _nc + ',qop=auth,algorithm=MD5\r\nExpires: 3600\r\n' +
                                                    'Allow: OPTIONS, INFO, SUBSCRIBE, NOTIFY, PUBLISH, INVITE, ACK, BYE, CANCEL, UPDATE, PRACK, MESSAGE, REFER, REGISTER\r\n' +
                                                    'Max-Forwards: 70\r\n' +
                                                    'User-Agent: ACE Dial Server 1.0.16.20\r\n' +
                                                    'Content-Length:  0\r\n\r\n';
                                                'Content-Type: ' + v_SIPMessages.Data.headers[ "Content-Type" ] + '\r\n' +
                                                    'Content-Length:  ' + v_SIPMessages.Data.headers[ "Content-Length" ] + '\r\n\r\n' +
                                                    v_SIPMessages.Data.payloadSDP + '\r\n';
                                                v_SIPMessages.Data.viaURI.branch = Viabranch;
                                                v_SIPMessages.Data.rawMsg = ( Invite_message );

                                                if ( v_SIPMessages !== null || v_SIPMessages !== undefined ) {

                                                    cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( v_SIPMessages ) );

                                                    Helper.print( "Sending " + v_SIPMessages.Data.headers[ "Request-Line" ] + " 887" );

                                                    socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {
                                                        // console.log(`Send Invite On Invite: ${JSON.stringify(v_SIPMessages, null, 4)}`);
                                                    } );
                                                }
                                            } else {
                                                let HA1 = md5( v_SIPMessages.Data.fromURI.user + ':' + realm + ':' + 'Test2000' );
                                                let HA2 = md5( method + ':' + 'sip:' + RemoteTransportServer );
                                                let calResponse = md5( HA1 + ':' + nonce + ':' + HA2 );
                                                let Invite_message = v_SIPMessages.Data.headers[ "Request-Line" ] + '\r\n' +
                                                    // 'Via: SIP/2.0/UDP ' +viaURI.host+':'+viaURI.port+';'+Viabranch  + '\r\n' + //v_SIPMessages.Data.headers["Via"]
                                                    'Via: ' + v_SIPMessages.Data.headers[ "Via" ] + '\r\n' +
                                                    'From: ' + v_SIPMessages.Data.headers[ "From" ] + '\r\n' +
                                                    'To: ' + v_SIPMessages.Data.headers[ "To" ] + '\r\n' +
                                                    'Call-ID: ' + v_SIPMessages.Data.headers[ "Call-ID" ] + '\r\n' +
                                                    'CSeq: ' + v_SIPMessages.Data.cSeq + ' ' + v_SIPMessages.Data.cSeqMethod + '\r\n' +
                                                    'Contact: ' + v_SIPMessages.Data.headers[ "Contact" ] + '\r\n' +
                                                    'Authorization: Digest username=\"' + v_SIPMessages.Data.fromURI.user + '\",realm=\"' + realm + '\",nonce=\"' + nonce + '\",uri=\"sip:' + RemoteTransportServer + '\",response=\"' + calResponse + '\",' +
                                                    'algorithm=MD5\r\n' +
                                                    'Expires: 3600\r\n' +
                                                    'Max-Forwards: 70\r\n' +
                                                    'User-Agent: ACE Dial Server 1.0.16.20\r\n' +
                                                    'Content-Type: application/sdp\r\n' +
                                                    'Content-Length:  ' + v_SIPMessages.Data.headers[ "Content-Length" ] + '\r\n\r\n' + v_SIPMessages.Data.payloadSDP;
                                                v_SIPMessages.Data.viaURI.branch = Viabranch;
                                                v_SIPMessages.Data.rawMsg = ( Invite_message );
                                                if ( v_SIPMessages !== null || v_SIPMessages !== undefined ) {

                                                    cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( v_SIPMessages ) );
                                                    Helper.print( "Sending " + v_SIPMessages.Data.headers[ "Request-Line" ] + " 918" );

                                                    socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP, ( err, bytes ) => {
                                                        //console.log(`Send Invite On Invite: ${JSON.stringify(v_SIPMessages, null, 4)}`);

                                                    } );
                                                }
                                            }
                                        }

                                    }
                                } catch ( e ) {
                                    return console.error( "ERROR====+++++++++++++++++=====>> : " + e );
                                }
                            } );
                        } catch ( e ) {
                            return console.error( "ERROR : " + e );
                        }
                    } );
                } catch ( db ) {
                    return console.error( "ERROR : in DB " + db );
                }
            } else if ( strng.slice( 0, 7 ) === "SIP/2.0" ) {

                let _data = Helper.DeepClone( EventDataMethod.Data );
                let cSeq = _data.cSeq;
                let v_ContactURIHost = _data.contactURI.host;
                let v_ContactURIPort = _data.contactURI.port;
                let cSeqMethod = _data.cSeqMethod;
                let statusCode = _data.statusCode;
                let v_PayloadSDP = {};
                let v_SIPHeaders = {};
                let v_SIPMessages = {};
                let v_ReturnCode = {};

                try {
                    connection.getConnection( function ( err, connection_local ) {

                        if ( err ) {
                            Helper.consoleLine( "Error in creating connection with database" );
                            Helper.print( err );
                            return;
                        }
                        let sql_TX = 'Call TX_SIPEventHandler("SIP.Response.Received",\'' + ( JSON.stringify( _data.headers ).replace( /\\"/g, '\\\\"' ) ) + '\',"' + _data.callID + '","' +
                            _data.viaURI.branch + '","' + _data.statusCode + '","' + cSeq + '","' + cSeqMethod + '","' + v_ContactURIHost + '","' + v_ContactURIPort + '","' +
                            _data.payloadSDP + '",\'' + ( _data.rawMsg ).toString().replace( /\"/g, '\\\\"' ) + '\',"' + POPName + '",@v_PayloadSDP,@v_SIPHeaders,@v_SIPMessages, @v_ReturnCode);' +
                            'SELECT @v_PayloadSDP,@v_SIPHeaders,@v_SIPMessages, @v_ReturnCode;';

                        //  console.log("===================================\n\n\n\n\n\n\n\n" + sql_TX);
                        try {
                            connection_local.query( sql_TX, function ( err, Result_TX ) {
                                if ( err ) {
                                    Helper.consoleLine( "Error in executing query" );
                                    Helper.print( sql_TX );
                                    Helper.print( err );
                                    return;
                                }

                                if ( err )
                                    console.log( '"SIP..Received-Error"\n\n\n\n\n\n\n\n=====================================================================================================Error while performing Query.' + err );
                                try {
                                    v_SIPMessages = JSON.parse( Result_TX[ 1 ][ 0 ][ '@v_SIPMessages' ] );
                                    v_ReturnCode = ( Result_TX[ 1 ][ 0 ][ '@v_ReturnCode' ] );

                                } catch ( e ) {
                                    return console.error( "ERROR : " + e );
                                }
                                if ( v_ReturnCode === 0 ) {
                                    // console.log(`Length v_SIPMessages: ${v_SIPMessages.length}`);
                                    try {
                                        if ( strng.slice( 8, 11 ) !== "100" ) {
                                            if ( v_SIPMessages.length > 0 ) {
                                                for ( let i = 0; i < v_SIPMessages.length; i++ ) {
                                                    cleanJson = Helper.DeepClone( JsonConverter.Convert_TO_Clean( v_SIPMessages[ i ] ) );
                                                    Helper.print( "Sending " + v_SIPMessages[ i ].Data.headers[ "Request-Line" ] + " at line 992" );
                                                    socket.send( Buffer.from( JSON.stringify( cleanJson ) ), RemotePort, RemoteIP,
                                                        ( err, bytes ) => {
                                                            console.log( `Send Genaric : ${JSON.stringify( cleanJson, null, 4 )}` );
                                                        }
                                                    );
                                                }
                                            }
                                        }
                                    } catch ( loop ) {
                                        return console.error( "ERROR : Loop->" + loop );
                                    }
                                } else {
                                    Helper.consoleLine( "Call ID dosen't exist" );
                                    Helper.print( sql_TX );
                                    Helper.print( "With return code : " + v_ReturnCode );
                                    //console.log( '"Error"\n\n\n\n\n\n\n\n=====================================================================================================Error in Return code .' + v_ReturnCode );
                                }

                            } );
                        } catch ( qryError ) {
                            return console.error( "ERROR : in qryError " + qryError );
                        }
                        connection_local.release();
                    } );
                } catch ( db ) {
                    return console.error( "ERROR : in DB " + db );
                }
            } else {
                console.log( `\nUn Recongnized Response-Line Messages ${strng}` );
            }
        } else {
            console.log( `\nUn Recongnized Method neither Request-Line nor Response-Line ${strng}` );
        }
    }
    OnListen() {
        const address = socket.address();
        console.log( `server listening ${address.address}:${address.port}` );
    }
}
let UDP_SIP_Call_Flow = new Client();