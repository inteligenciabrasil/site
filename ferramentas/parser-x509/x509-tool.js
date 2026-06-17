/* X.509 Certificate Parser - standalone JS, 100% client-side. */
(function () {
    'use strict';

    var $in = document.getElementById('x509Input');
    var $parseBtn = document.getElementById('x509ParseBtn');
    var $fileInput = document.getElementById('x509FileInput');
    var $sampleBtn = document.getElementById('x509SampleBtn');
    var $clearBtn = document.getElementById('x509ClearBtn');
    var $err = document.getElementById('x509Error');
    var $out = document.getElementById('x509Results');

    if (!$in || !$parseBtn) return;

    // --- OID dictionaries ---
    var OID_DN = {
        '2.5.4.3': 'CN', '2.5.4.4': 'SN', '2.5.4.5': 'serialNumber', '2.5.4.6': 'C',
        '2.5.4.7': 'L', '2.5.4.8': 'ST', '2.5.4.9': 'STREET', '2.5.4.10': 'O',
        '2.5.4.11': 'OU', '2.5.4.12': 'T', '2.5.4.13': 'description', '2.5.4.15': 'businessCategory',
        '2.5.4.17': 'postalCode', '2.5.4.42': 'GN', '2.5.4.97': 'organizationIdentifier',
        '1.2.840.113549.1.9.1': 'emailAddress', '0.9.2342.19200300.100.1.25': 'DC',
        '1.3.6.1.4.1.311.60.2.1.3': 'jurisdictionC', '1.3.6.1.4.1.311.60.2.1.2': 'jurisdictionST',
        '1.3.6.1.4.1.311.60.2.1.1': 'jurisdictionL'
    };
    var OID_SIG = {
        '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
        '1.2.840.113549.1.1.4': 'md5WithRSAEncryption',
        '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
        '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
        '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
        '1.2.840.113549.1.1.10': 'RSASSA-PSS',
        '1.2.840.10045.4.1': 'ecdsa-with-SHA1',
        '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
        '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
        '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
        '1.3.101.112': 'Ed25519',
        '1.3.101.113': 'Ed448'
    };
    var OID_PK = {
        '1.2.840.113549.1.1.1': 'RSA',
        '1.2.840.10045.2.1': 'EC',
        '1.3.101.112': 'Ed25519',
        '1.3.101.113': 'Ed448'
    };
    var OID_CURVE = {
        '1.2.840.10045.3.1.7': 'P-256 (secp256r1)',
        '1.3.132.0.34': 'P-384 (secp384r1)',
        '1.3.132.0.35': 'P-521 (secp521r1)',
        '1.3.132.0.10': 'secp256k1'
    };
    var OID_EXT = {
        '2.5.29.14': 'Subject Key Identifier (SKI)',
        '2.5.29.15': 'Key Usage',
        '2.5.29.17': 'Subject Alternative Name (SAN)',
        '2.5.29.18': 'Issuer Alternative Name',
        '2.5.29.19': 'Basic Constraints',
        '2.5.29.31': 'CRL Distribution Points',
        '2.5.29.32': 'Certificate Policies',
        '2.5.29.35': 'Authority Key Identifier (AKI)',
        '2.5.29.37': 'Extended Key Usage (EKU)',
        '1.3.6.1.5.5.7.1.1': 'Authority Info Access (AIA)',
        '1.3.6.1.4.1.11129.2.4.2': 'CT Precertificate SCTs',
        '1.3.6.1.5.5.7.1.24': 'TLS Feature',
        '2.5.29.30': 'Name Constraints'
    };
    var OID_EKU = {
        '1.3.6.1.5.5.7.3.1': 'serverAuth',
        '1.3.6.1.5.5.7.3.2': 'clientAuth',
        '1.3.6.1.5.5.7.3.3': 'codeSigning',
        '1.3.6.1.5.5.7.3.4': 'emailProtection',
        '1.3.6.1.5.5.7.3.5': 'ipsecEndSystem',
        '1.3.6.1.5.5.7.3.8': 'timeStamping',
        '1.3.6.1.5.5.7.3.9': 'OCSPSigning',
        '1.3.6.1.4.1.311.10.3.4': 'msEncryptingFileSystem',
        '1.3.6.1.4.1.311.20.2.2': 'msSmartcardLogon'
    };
    var OID_AIA = {
        '1.3.6.1.5.5.7.48.1': 'OCSP',
        '1.3.6.1.5.5.7.48.2': 'caIssuers'
    };

    // --- ASN.1 DER parser ---
    function parseTLV(buf, offset) {
        offset = offset || 0;
        if (offset + 2 > buf.length) throw new Error('ASN.1: prematuro EOF no header');
        var tag = buf[offset];
        var p = offset + 1;
        var first = buf[p++];
        var length;
        if ((first & 0x80) === 0) {
            length = first;
        } else {
            var nLen = first & 0x7F;
            if (nLen === 0) throw new Error('ASN.1: indefinite length nao suportada');
            if (nLen > 4) throw new Error('ASN.1: length excede 4 bytes (' + nLen + ')');
            length = 0;
            for (var i = 0; i < nLen; i++) {
                if (p >= buf.length) throw new Error('ASN.1: prematuro EOF no length');
                length = (length * 256) + buf[p++];
            }
        }
        if (p + length > buf.length) throw new Error('ASN.1: TLV excede buffer');
        return {
            tag: tag,
            cls: (tag & 0xC0) >> 6,
            constructed: (tag & 0x20) !== 0,
            tagNumber: tag & 0x1F,
            headerStart: offset,
            headerEnd: p,
            end: p + length,
            length: length,
            content: buf.subarray(p, p + length),
            raw: buf.subarray(offset, p + length)
        };
    }
    function parseChildren(tlv) {
        var arr = [];
        var pos = 0;
        while (pos < tlv.content.length) {
            var sub = parseTLV(tlv.content, pos);
            arr.push(sub);
            pos = sub.end;
        }
        return arr;
    }
    function parseOID(bytes) {
        if (!bytes.length) return '';
        var arcs = [];
        var first = bytes[0];
        arcs.push(Math.floor(first / 40));
        arcs.push(first % 40);
        var val = 0;
        for (var i = 1; i < bytes.length; i++) {
            val = (val * 128) + (bytes[i] & 0x7F);
            if ((bytes[i] & 0x80) === 0) {
                arcs.push(val);
                val = 0;
            }
        }
        return arcs.join('.');
    }
    function bytesToHex(bytes) {
        return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(':');
    }
    function bytesToHexCompact(bytes) {
        return Array.prototype.map.call(bytes, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
    }
    function readString(tlv) {
        try {
            return new TextDecoder('utf-8', { fatal: false }).decode(tlv.content);
        } catch (e) {
            return Array.prototype.map.call(tlv.content, function (b) { return String.fromCharCode(b); }).join('');
        }
    }
    function parseTime(tlv) {
        var s = readString(tlv);
        var isGen = tlv.tagNumber === 24; // GeneralizedTime
        var Y, M, D, h, m, sec, off = 0;
        if (isGen) {
            Y = parseInt(s.substring(0, 4), 10); off = 4;
        } else {
            var yy = parseInt(s.substring(0, 2), 10);
            Y = yy < 50 ? 2000 + yy : 1900 + yy;
            off = 2;
        }
        M = parseInt(s.substring(off, off + 2), 10); off += 2;
        D = parseInt(s.substring(off, off + 2), 10); off += 2;
        h = parseInt(s.substring(off, off + 2), 10); off += 2;
        m = parseInt(s.substring(off, off + 2), 10); off += 2;
        sec = parseInt(s.substring(off, off + 2), 10);
        return new Date(Date.UTC(Y, M - 1, D, h, m, sec));
    }
    function parseDN(seqTLV) {
        var parts = [];
        var rdns = parseChildren(seqTLV);
        rdns.forEach(function (rdn) {
            var avs = parseChildren(rdn);
            avs.forEach(function (av) {
                var pair = parseChildren(av);
                if (pair.length === 2) {
                    var oid = parseOID(pair[0].content);
                    var val = readString(pair[1]);
                    var name = OID_DN[oid] || oid;
                    parts.push(name + '=' + val);
                }
            });
        });
        return parts.join(', ');
    }
    function parseBitString(tlv) {
        // First byte = unused bits; rest = actual bits
        if (tlv.content.length < 1) return new Uint8Array(0);
        return tlv.content.subarray(1);
    }

    // --- Certificate-level extraction ---
    function parseCertificate(derBytes) {
        var cert = parseTLV(derBytes, 0);
        if (!cert.constructed || cert.tagNumber !== 16) throw new Error('Esperava SEQUENCE no Certificate');
        var top = parseChildren(cert);
        if (top.length < 3) throw new Error('Certificate deveria ter 3 elementos (tbs, sigAlg, sigVal)');
        var tbs = top[0], sigAlg = top[1], sigVal = top[2];

        var tbsChildren = parseChildren(tbs);
        var pos = 0;
        var version = 1;
        if (tbsChildren[0].tag === 0xA0) { // [0] EXPLICIT
            var verChildren = parseChildren(tbsChildren[0]);
            version = verChildren[0].content[0] + 1;
            pos = 1;
        }
        var serial = bytesToHex(tbsChildren[pos++].content);
        var tbsSigAlg = tbsChildren[pos++]; // AlgorithmIdentifier
        var issuer = parseDN(tbsChildren[pos++]);
        var validityTLV = tbsChildren[pos++];
        var subject = parseDN(tbsChildren[pos++]);
        var spki = tbsChildren[pos++]; // SubjectPublicKeyInfo
        var extensionsTLV = null;
        // remaining: issuerUniqueID [1], subjectUniqueID [2], extensions [3]
        for (; pos < tbsChildren.length; pos++) {
            if (tbsChildren[pos].tag === 0xA3) { extensionsTLV = tbsChildren[pos]; }
        }

        // Validity
        var validityChildren = parseChildren(validityTLV);
        var notBefore = parseTime(validityChildren[0]);
        var notAfter = parseTime(validityChildren[1]);

        // Signature algorithm (outer + inner should match)
        var sigAlgOid = parseOID(parseChildren(sigAlg)[0].content);
        var sigAlgName = OID_SIG[sigAlgOid] || sigAlgOid;

        // Public key
        var spkiChildren = parseChildren(spki);
        var pkAlgOid = parseOID(parseChildren(spkiChildren[0])[0].content);
        var pkAlgName = OID_PK[pkAlgOid] || pkAlgOid;
        var pkBits = parseBitString(spkiChildren[1]);
        var pkInfo = { algorithm: pkAlgName, oid: pkAlgOid };
        if (pkAlgName === 'RSA') {
            // RSAPublicKey ::= SEQUENCE { modulus INTEGER, publicExponent INTEGER }
            try {
                var rsaSeq = parseTLV(pkBits, 0);
                var rsaChildren = parseChildren(rsaSeq);
                var modBytes = rsaChildren[0].content;
                // Strip leading 0 sign byte
                if (modBytes[0] === 0x00) modBytes = modBytes.subarray(1);
                pkInfo.keySize = modBytes.length * 8;
                pkInfo.modulusHexShort = bytesToHexCompact(modBytes.subarray(0, 8)) + '...' + bytesToHexCompact(modBytes.subarray(modBytes.length - 4));
                var expBytes = rsaChildren[1].content;
                var exp = 0;
                for (var i = 0; i < expBytes.length; i++) exp = (exp * 256) + expBytes[i];
                pkInfo.exponent = exp;
            } catch (e) { /* tolerar */ }
        } else if (pkAlgName === 'EC') {
            // Parameters in spkiChildren[0] children[1] is the curve OID
            try {
                var algIdChildren = parseChildren(spkiChildren[0]);
                if (algIdChildren.length >= 2 && algIdChildren[1].tag === 0x06) {
                    var curveOid = parseOID(algIdChildren[1].content);
                    pkInfo.curve = OID_CURVE[curveOid] || curveOid;
                    if (/P-256/.test(pkInfo.curve)) pkInfo.keySize = 256;
                    else if (/P-384/.test(pkInfo.curve)) pkInfo.keySize = 384;
                    else if (/P-521/.test(pkInfo.curve)) pkInfo.keySize = 521;
                }
            } catch (e) { /* tolerar */ }
        } else if (pkAlgName === 'Ed25519') {
            pkInfo.keySize = 256;
        }

        // Extensions
        var extensions = [];
        if (extensionsTLV) {
            var extSeq = parseChildren(extensionsTLV)[0];
            var extList = parseChildren(extSeq);
            extList.forEach(function (extTLV) {
                var extChildren = parseChildren(extTLV);
                var oid = parseOID(extChildren[0].content);
                var critical = false;
                var valueTLV;
                if (extChildren[1].tag === 0x01) {
                    critical = extChildren[1].content[0] !== 0;
                    valueTLV = extChildren[2];
                } else {
                    valueTLV = extChildren[1];
                }
                // valueTLV is OCTET STRING wrapping the actual extension value
                var inner;
                try { inner = parseTLV(valueTLV.content, 0); } catch (e) { inner = null; }
                extensions.push({
                    oid: oid,
                    name: OID_EXT[oid] || ('OID ' + oid),
                    critical: critical,
                    value: inner,
                    raw: valueTLV.content
                });
            });
        }

        return {
            version: version,
            serial: serial,
            sigAlg: sigAlgName,
            sigAlgOid: sigAlgOid,
            issuer: issuer,
            subject: subject,
            notBefore: notBefore,
            notAfter: notAfter,
            pubKey: pkInfo,
            extensions: extensions,
            derLength: derBytes.length,
            derBytes: derBytes
        };
    }

    // --- Extension renderers ---
    function renderExtension(ext) {
        var v;
        if (ext.oid === '2.5.29.17' || ext.oid === '2.5.29.18') {
            v = renderGeneralNames(ext.value);
        } else if (ext.oid === '2.5.29.19') {
            v = renderBasicConstraints(ext.value);
        } else if (ext.oid === '2.5.29.15') {
            v = renderKeyUsage(ext.value);
        } else if (ext.oid === '2.5.29.37') {
            v = renderEKU(ext.value);
        } else if (ext.oid === '2.5.29.14') {
            v = bytesToHex(ext.value.content);
        } else if (ext.oid === '2.5.29.35') {
            v = renderAKI(ext.value);
        } else if (ext.oid === '1.3.6.1.5.5.7.1.1') {
            v = renderAIA(ext.value);
        } else if (ext.oid === '2.5.29.31') {
            v = renderCDP(ext.value);
        } else if (ext.oid === '1.3.6.1.4.1.11129.2.4.2') {
            v = 'Signed Certificate Timestamps (CT). Total bytes: ' + (ext.raw.length);
        } else {
            v = 'OID ' + ext.oid + ' (raw ' + ext.raw.length + ' bytes)';
        }
        return v;
    }
    function renderGeneralNames(seqTLV) {
        if (!seqTLV) return '(vazio)';
        var items = [];
        parseChildren(seqTLV).forEach(function (gn) {
            // [0] otherName, [1] rfc822Name, [2] dNSName, [4] directoryName, [6] uniformResourceIdentifier, [7] iPAddress
            var tagNum = gn.tag & 0x1F;
            var data = gn.content;
            switch (tagNum) {
                case 1: items.push('email:' + decodeAscii(data)); break;
                case 2: items.push('DNS:' + decodeAscii(data)); break;
                case 6: items.push('URI:' + decodeAscii(data)); break;
                case 7:
                    if (data.length === 4) items.push('IP:' + data.join('.'));
                    else if (data.length === 16) items.push('IP:' + ipv6FromBytes(data));
                    else items.push('IP:' + bytesToHex(data));
                    break;
                case 4: try { items.push('dirName:' + parseDN(parseTLV(data, 0))); } catch (e) { items.push('dirName:?'); } break;
                default: items.push('[' + tagNum + ']:' + bytesToHex(data).substring(0, 40));
            }
        });
        return items;
    }
    function decodeAscii(bytes) {
        return Array.prototype.map.call(bytes, function (b) { return String.fromCharCode(b); }).join('');
    }
    function ipv6FromBytes(bytes) {
        var parts = [];
        for (var i = 0; i < 16; i += 2) {
            parts.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
        }
        return parts.join(':');
    }
    function renderBasicConstraints(seqTLV) {
        if (!seqTLV) return 'CA: FALSE (default)';
        var kids = parseChildren(seqTLV);
        var ca = false;
        var pathLen = null;
        kids.forEach(function (k) {
            if (k.tag === 0x01) ca = k.content[0] !== 0;
            else if (k.tag === 0x02) {
                var v = 0;
                for (var i = 0; i < k.content.length; i++) v = (v * 256) + k.content[i];
                pathLen = v;
            }
        });
        return 'CA: ' + (ca ? 'TRUE' : 'FALSE') + (pathLen !== null ? ', pathLenConstraint: ' + pathLen : '');
    }
    function renderKeyUsage(bitStringTLV) {
        if (!bitStringTLV) return '(vazio)';
        var bits = parseBitString(bitStringTLV);
        var unused = bitStringTLV.content[0];
        var names = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment',
                    'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly'];
        var totalBits = bits.length * 8 - unused;
        var out = [];
        for (var i = 0; i < totalBits && i < names.length; i++) {
            var byteIdx = Math.floor(i / 8);
            var bitIdx = 7 - (i % 8);
            if ((bits[byteIdx] >> bitIdx) & 1) out.push(names[i]);
        }
        return out;
    }
    function renderEKU(seqTLV) {
        if (!seqTLV) return [];
        return parseChildren(seqTLV).map(function (k) {
            var oid = parseOID(k.content);
            return OID_EKU[oid] || oid;
        });
    }
    function renderAKI(seqTLV) {
        if (!seqTLV) return '(vazio)';
        var kids = parseChildren(seqTLV);
        for (var i = 0; i < kids.length; i++) {
            if ((kids[i].tag & 0x1F) === 0) { // [0] keyIdentifier
                return bytesToHex(kids[i].content);
            }
        }
        return '(sem keyIdentifier)';
    }
    function renderAIA(seqTLV) {
        if (!seqTLV) return [];
        var out = [];
        parseChildren(seqTLV).forEach(function (entry) {
            var kids = parseChildren(entry);
            var oid = parseOID(kids[0].content);
            var name = OID_AIA[oid] || oid;
            var loc = kids[1] ? decodeAscii(kids[1].content) : '';
            out.push(name + ': ' + loc);
        });
        return out;
    }
    function renderCDP(seqTLV) {
        if (!seqTLV) return [];
        var out = [];
        parseChildren(seqTLV).forEach(function (dp) {
            // DistributionPoint, walk to find URI
            var kids = parseChildren(dp);
            kids.forEach(function (k) {
                if ((k.tag & 0x1F) === 0) {
                    // DistributionPointName: [0] EXPLICIT  -> fullName [0] IMPLICIT
                    var inner = parseChildren(k);
                    inner.forEach(function (gn) {
                        if ((gn.tag & 0x1F) === 0) {
                            // generalNames inside
                            try {
                                var gns = parseChildren(gn);
                                gns.forEach(function (g) {
                                    if ((g.tag & 0x1F) === 6) out.push('URI: ' + decodeAscii(g.content));
                                });
                            } catch (e) { /* fallback */ out.push('URI: ' + decodeAscii(gn.content)); }
                        }
                    });
                }
            });
        });
        return out;
    }

    // --- Lint checks ---
    function lintCert(cert, isLast) {
        var notes = [];
        var now = Date.now();
        var daysRemaining = Math.round((cert.notAfter.getTime() - now) / 86400000);
        if (now > cert.notAfter.getTime()) {
            notes.push({ kind: 'error', text: 'Certificado EXPIRADO em ' + cert.notAfter.toISOString().substring(0, 10) });
        } else if (daysRemaining < 14) {
            notes.push({ kind: 'error', text: 'Certificado expira em ' + daysRemaining + ' dia(s) - ACAO IMEDIATA' });
        } else if (daysRemaining < 30) {
            notes.push({ kind: 'warning', text: 'Certificado expira em ' + daysRemaining + ' dias' });
        } else if (daysRemaining < 60) {
            notes.push({ kind: 'info', text: 'Certificado expira em ' + daysRemaining + ' dias' });
        } else {
            notes.push({ kind: 'ok', text: 'Validade saudavel: ' + daysRemaining + ' dias restantes' });
        }
        // Validity span
        var daysSpan = Math.round((cert.notAfter.getTime() - cert.notBefore.getTime()) / 86400000);
        if (daysSpan > 398 && isLast) {
            notes.push({ kind: 'warning', text: 'Validade total = ' + daysSpan + ' dias. Desde set/2020 navegadores rejeitam TLS publico com >398 dias.' });
        }
        // Signature algorithm
        var weakSig = /sha1With|md5With|ecdsa-with-SHA1/i;
        if (weakSig.test(cert.sigAlg)) {
            notes.push({ kind: 'error', text: 'Algoritmo de assinatura fraco: ' + cert.sigAlg + ' (rejeitado em TLS publico)' });
        } else {
            notes.push({ kind: 'ok', text: 'Algoritmo de assinatura: ' + cert.sigAlg });
        }
        // Key size
        if (cert.pubKey.algorithm === 'RSA') {
            if (!cert.pubKey.keySize) {
                notes.push({ kind: 'info', text: 'RSA com tamanho de chave nao detectado' });
            } else if (cert.pubKey.keySize < 2048) {
                notes.push({ kind: 'error', text: 'Chave RSA de ' + cert.pubKey.keySize + ' bits - inseguro (NIST recomenda 2048+)' });
            } else {
                notes.push({ kind: 'ok', text: 'Chave RSA de ' + cert.pubKey.keySize + ' bits' });
            }
        } else if (cert.pubKey.algorithm === 'EC') {
            notes.push({ kind: 'ok', text: 'Chave EC: ' + (cert.pubKey.curve || 'curva nao detectada') });
        } else if (cert.pubKey.algorithm === 'Ed25519') {
            notes.push({ kind: 'ok', text: 'Chave Ed25519 - moderna e eficiente' });
        }
        // Extensions checks
        var hasSAN = false, hasBC = false, isCA = false, hasEKU = false, hasServerAuth = false, hasSKI = false, hasAKI = false;
        cert.extensions.forEach(function (e) {
            if (e.oid === '2.5.29.17') hasSAN = true;
            if (e.oid === '2.5.29.19') {
                hasBC = true;
                var bc = renderBasicConstraints(e.value);
                if (/CA: TRUE/.test(bc)) isCA = true;
            }
            if (e.oid === '2.5.29.37') {
                hasEKU = true;
                var eku = renderEKU(e.value);
                if (Array.isArray(eku) && eku.indexOf('serverAuth') !== -1) hasServerAuth = true;
            }
            if (e.oid === '2.5.29.14') hasSKI = true;
            if (e.oid === '2.5.29.35') hasAKI = true;
        });
        if (isCA && isLast) {
            // CA cert
            notes.push({ kind: 'info', text: 'Este e um certificado de CA (BasicConstraints CA:TRUE)' });
        } else if (!isCA) {
            if (!hasSAN) notes.push({ kind: 'error', text: 'End-entity sem SAN - navegadores modernos rejeitam' });
            if (!hasEKU) notes.push({ kind: 'warning', text: 'Sem ExtendedKeyUsage - cert sem proposito declarado' });
            else if (!hasServerAuth && isLast) notes.push({ kind: 'info', text: 'Sem serverAuth no EKU - cert nao e para TLS server' });
            if (hasBC && /CA: TRUE/.test(renderBasicConstraints(cert.extensions.find(function (e) { return e.oid === '2.5.29.19'; }).value))) {
                notes.push({ kind: 'error', text: 'CRITICO: End-entity com BasicConstraints CA:TRUE' });
            }
        }
        if (!hasSKI) notes.push({ kind: 'info', text: 'Sem Subject Key Identifier (recomendado)' });
        return notes;
    }

    // --- PEM/DER input handling ---
    function pemToDer(input) {
        // Returns array of Uint8Array, one per certificate in the input
        var blocks = [];
        var pemRe = /-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/g;
        var m;
        while ((m = pemRe.exec(input)) !== null) {
            var b64 = m[1].replace(/[\s\r\n]/g, '');
            var bin;
            try { bin = atob(b64); }
            catch (e) { throw new Error('Base64 invalido em bloco PEM: ' + e.message); }
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            blocks.push(bytes);
        }
        if (blocks.length === 0) {
            // Maybe raw base64?
            var stripped = input.replace(/[\s\r\n]/g, '');
            if (/^[A-Za-z0-9+/=]+$/.test(stripped) && stripped.length > 100) {
                try {
                    var bin2 = atob(stripped);
                    var arr = new Uint8Array(bin2.length);
                    for (var i = 0; i < bin2.length; i++) arr[i] = bin2.charCodeAt(i);
                    blocks.push(arr);
                } catch (e) { /* nao base64 valido */ }
            }
        }
        return blocks;
    }

    // --- WebCrypto fingerprints ---
    function sha256(bytes) {
        return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
            return bytesToHex(new Uint8Array(buf));
        });
    }
    function sha1(bytes) {
        return crypto.subtle.digest('SHA-1', bytes).then(function (buf) {
            return bytesToHex(new Uint8Array(buf));
        });
    }

    // --- Rendering ---
    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function renderKV(items) {
        var html = '<dl class="cert-kv">';
        items.forEach(function (it) {
            var ddCls = it.plain ? ' class="plain"' : '';
            var v = it.value;
            if (Array.isArray(v)) {
                v = '<ul>' + v.map(function (x) { return '<li>' + escapeHtml(x) + '</li>'; }).join('') + '</ul>';
            } else {
                v = escapeHtml(v);
            }
            html += '<dt>' + escapeHtml(it.label) + '</dt><dd' + ddCls + '>' + v + '</dd>';
        });
        html += '</dl>';
        return html;
    }
    function renderLint(notes) {
        var html = '<ul class="lint-list">';
        notes.forEach(function (n) {
            html += '<li class="' + n.kind + '">' + escapeHtml(n.text) + '</li>';
        });
        html += '</ul>';
        return html;
    }
    function badge(text, cls) { return '<span class="cert-badge ' + cls + '">' + escapeHtml(text) + '</span>'; }

    function pkSummary(pk) {
        if (pk.algorithm === 'RSA') return 'RSA ' + (pk.keySize || '?') + ' bits (e=' + (pk.exponent || '?') + ')';
        if (pk.algorithm === 'EC') return 'EC ' + (pk.curve || pk.oid);
        return pk.algorithm + (pk.keySize ? ' ' + pk.keySize + ' bits' : '');
    }

    function renderCert(cert, idx, total, fingerprints) {
        var isLast = idx === 0; // First in chain is usually end-entity
        var lint = lintCert(cert, isLast);
        var errCount = lint.filter(function (n) { return n.kind === 'error'; }).length;
        var warnCount = lint.filter(function (n) { return n.kind === 'warning'; }).length;

        var headerBadges = [];
        if (errCount > 0) headerBadges.push(badge(errCount + ' erro' + (errCount > 1 ? 's' : ''), 'error'));
        if (warnCount > 0) headerBadges.push(badge(warnCount + ' alerta' + (warnCount > 1 ? 's' : ''), 'warning'));
        if (errCount === 0 && warnCount === 0) headerBadges.push(badge('OK', 'ok'));

        // Subject CN abbreviation
        var subjCN = (cert.subject.match(/CN=([^,]+)/) || [])[1] || cert.subject || '(sem CN)';
        var role = idx === 0 ? 'End-entity' : (idx === total - 1 ? 'Raiz / topo da cadeia' : 'Intermediario');

        var html = '<div class="cert-card">';
        html += '<div class="cert-card-header">';
        html += '<div><h3 class="cert-card-title"><i class="fas fa-certificate"></i> ' + escapeHtml(subjCN) + '</h3>';
        html += '<div style="color:#94A3B8;font-size:.85rem;margin-top:4px">' + escapeHtml(role) + ' &middot; Cert ' + (idx + 1) + ' de ' + total + '</div></div>';
        html += '<div class="cert-status-row">' + headerBadges.join(' ') + '</div>';
        html += '</div>';
        html += '<div class="cert-body">';

        // Identidade
        html += '<div class="cert-section"><h4 class="cert-section-title">Identidade</h4>';
        html += renderKV([
            { label: 'Subject', value: cert.subject, plain: true },
            { label: 'Issuer', value: cert.issuer, plain: true },
            { label: 'Versao', value: 'v' + cert.version, plain: true },
            { label: 'Serial Number', value: cert.serial }
        ]);
        html += '</div>';

        // Validade
        html += '<div class="cert-section"><h4 class="cert-section-title">Validade</h4>';
        html += renderKV([
            { label: 'Not Before', value: cert.notBefore.toISOString().replace('T', ' ').substring(0, 19) + ' UTC', plain: true },
            { label: 'Not After', value: cert.notAfter.toISOString().replace('T', ' ').substring(0, 19) + ' UTC', plain: true }
        ]);
        html += '</div>';

        // Algoritmos
        html += '<div class="cert-section"><h4 class="cert-section-title">Algoritmos</h4>';
        html += renderKV([
            { label: 'Signature Algorithm', value: cert.sigAlg, plain: true },
            { label: 'Public Key', value: pkSummary(cert.pubKey), plain: true }
        ]);
        html += '</div>';

        // Fingerprints
        html += '<div class="cert-section"><h4 class="cert-section-title">Fingerprints</h4>';
        html += renderKV([
            { label: 'SHA-256', value: fingerprints.sha256 },
            { label: 'SHA-1', value: fingerprints.sha1 }
        ]);
        html += '</div>';

        // Extensoes
        if (cert.extensions.length) {
            html += '<div class="cert-section"><h4 class="cert-section-title">Extensoes (' + cert.extensions.length + ')</h4>';
            var extItems = cert.extensions.map(function (ext) {
                var label = ext.name + (ext.critical ? ' [critical]' : '');
                return { label: label, value: renderExtension(ext), plain: !!(ext.oid === '2.5.29.19' || ext.oid === '2.5.29.15') };
            });
            html += renderKV(extItems);
            html += '</div>';
        }

        // Lint
        html += '<div class="cert-section"><h4 class="cert-section-title">Analise (lint)</h4>';
        html += renderLint(lint);
        html += '</div>';

        html += '</div></div>';
        return html;
    }

    // --- Main flow ---
    function clearError() { $err.classList.remove('show'); $err.textContent = ''; }
    function showError(msg) { $err.classList.add('show'); $err.textContent = msg; }
    function clearResults() { $out.innerHTML = ''; $out.classList.remove('show'); }

    function parseAndRender(rawInput) {
        clearError();
        clearResults();
        try {
            var derBlocks = pemToDer(rawInput);
            if (derBlocks.length === 0) {
                showError('Nenhum certificado PEM encontrado. Cole um PEM valido (com -----BEGIN CERTIFICATE-----) ou faca upload de um arquivo.');
                return;
            }
            // If input was a single DER raw upload, pemToDer returns a single block also
            var parsed = derBlocks.map(function (der) { return { cert: parseCertificate(der), der: der }; });
            // Compute fingerprints
            Promise.all(parsed.map(function (p) {
                return Promise.all([sha256(p.der), sha1(p.der)]).then(function (fps) {
                    return { sha256: fps[0], sha1: fps[1] };
                });
            })).then(function (fpList) {
                var html = '';
                if (parsed.length > 1) {
                    html += '<div class="highlight-box info" style="margin-bottom:1rem"><div class="highlight-box-title"><i class="fas fa-link"></i> Cadeia de ' + parsed.length + ' certificados</div><p>O parser identificou ' + parsed.length + ' certificados. O primeiro abaixo e o end-entity (folha); os demais sao intermediarios/raiz na ordem em que foram colados.</p></div>';
                }
                parsed.forEach(function (p, idx) {
                    html += renderCert(p.cert, idx, parsed.length, fpList[idx]);
                });
                $out.innerHTML = html;
                $out.classList.add('show');
            });
        } catch (e) {
            showError('Erro ao parsear: ' + e.message);
            console.error(e);
        }
    }

    $parseBtn.addEventListener('click', function () {
        var v = $in.value;
        if (!v.trim()) { showError('Cole um certificado PEM ou carregue um arquivo.'); return; }
        parseAndRender(v);
    });
    $clearBtn.addEventListener('click', function () {
        $in.value = '';
        clearError();
        clearResults();
    });
    $fileInput.addEventListener('change', function (e) {
        var f = e.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
            var content = ev.target.result;
            // If looks like PEM, put in textarea and parse; otherwise it's DER - convert to PEM for display
            if (typeof content === 'string' && content.indexOf('-----BEGIN CERTIFICATE-----') !== -1) {
                $in.value = content;
                parseAndRender(content);
            } else {
                // ArrayBuffer (DER)
                var bytes = new Uint8Array(content);
                // Build PEM for the textarea
                var bin = '';
                for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                var b64 = btoa(bin);
                var pem = '-----BEGIN CERTIFICATE-----\n' + (b64.match(/.{1,64}/g) || []).join('\n') + '\n-----END CERTIFICATE-----';
                $in.value = pem;
                parseAndRender(pem);
            }
        };
        // Detect: read as text if probably PEM, else binary
        if (f.name.toLowerCase().endsWith('.der')) reader.readAsArrayBuffer(f);
        else reader.readAsText(f);
        // Reset value so the same file can be re-uploaded
        $fileInput.value = '';
    });

    // Sample certificate (Let's Encrypt R3 intermediate as a clean public example)
    var SAMPLE_PEM = '-----BEGIN CERTIFICATE-----\n' +
'MIIFFjCCAv6gAwIBAgIRAJErCErPDBinU/bWLiWnX1owDQYJKoZIhvcNAQELBQAw\n' +
'TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n' +
'cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMjAwOTA0MDAwMDAw\n' +
'WhcNMjUwOTE1MTYwMDAwWjAyMQswCQYDVQQGEwJVUzEWMBQGA1UEChMNTGV0J3Mg\n' +
'RW5jcnlwdDELMAkGA1UEAxMCUjMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK\n' +
'AoIBAQC7AhUozPaglNMPEuyNVZLD+ILxmaZ6QoinXSaqtSu5xUyxr45r+XXIo9cP\n' +
'R5QUVTVXjJ6oojkZ9YI8QqlObvU7wy7bjcCwXPNZOOftz2nwWgsbvsCUJCWH+jdx\n' +
'sxPnHKzhm+/b5DtFUkWWqcFTzjTIUu61ru2P3mBw4qVUq7ZtDpelQDRrK9O8Zutm\n' +
'NHz6a4uPVymZ+DAXXbpyb/uBxa3Shlg9F8fnCbvxK/eG3MHacV3URuPMrSXBiLxg\n' +
'Z3Vms/EY96Jc5lP/Ooi2R6X/ExjqmAl3P51T+c8B5fWmcBcUr2Ok/5mzk53cU6cG\n' +
'/kiFHaFpriV1uxPMUgP17VGhi9sVAgMBAAGjggEIMIIBBDAOBgNVHQ8BAf8EBAMC\n' +
'AYYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMBIGA1UdEwEB/wQIMAYB\n' +
'Af8CAQAwHQYDVR0OBBYEFBQusxe3WFbLrlAJQOYfr52LFMLGMB8GA1UdIwQYMBaA\n' +
'FHm0WeZ7tuXkAXOACIjIGlj26ZtuMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcw\n' +
'AoYWaHR0cDovL3gxLmkubGVuY3Iub3JnLzAnBgNVHR8EIDAeMBygGqAYhhZodHRw\n' +
'Oi8veDEuYy5sZW5jci5vcmcvMCIGA1UdIAQbMBkwCAYGZ4EMAQIBMA0GCysGAQQB\n' +
'gt8TAQEBMA0GCSqGSIb3DQEBCwUAA4ICAQCFyk5HPqP3hUSFvNVneLKYY611TR6W\n' +
'PTNlclQtgaDqw+34IL9fzLdwALduO/ZelN7kIJ+m74uyA+eitRY8kc607TkC53wl\n' +
'ikfmZW4/RvTZ8M6UK+5UzhK8jCdLuMGYL6KvzXGRSgi3yLgjewQtCPkIVz6D2QQz\n' +
'CkcheAmCJ8MqyJu5zlzyZMjAvnnAT45tRAxekrsu94sQ4egdRCnbWSDtY7kh+BIm\n' +
'lJNXoB1lBMEKIq4QDUOXoRgffuDghje1WrG9ML+Hbisq/yFOGwXD9RiX8F6sw6W4\n' +
'avAuvDszue5L3sz85K+EC4Y/wFVDNvZo4TYXao6Z0f+lQKc0t8DQYzk1OXVu8rp2\n' +
'yJMC6alLbBfODALZvYH7n7do1AZls4I9d1P4jnkDrQoxB3UqQ9hVl3LEKQ73xF1O\n' +
'yK5GhDDX8oVfGKF5u+decIsH4YaTw7mP3GFxJSqv3+0lUFJoi5Lc5da149p90Ids\n' +
'hCExroL1+7mryIkXPeFM5TgO9r0rvZaBFOvV2z0gp35Z0+L4WPlbuEjN/lxPFin+\n' +
'HlUjr8gRsI3qfJOQFy/9rKIJR0Y/8Omwt/8oTWgy1mdeHmmjk7j1nYsvC9JSQ6Zv\n' +
'MldlTTKB3zhThV1+XWYp6rjd5JW1zbVWEkLNxE7GJThEUG3szgBVGP7pSWTUTsqX\n' +
'nLRbwHOoq7hHwg==\n' +
'-----END CERTIFICATE-----';
    $sampleBtn.addEventListener('click', function () {
        $in.value = SAMPLE_PEM;
        parseAndRender(SAMPLE_PEM);
    });

})();
