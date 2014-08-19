'use strict';
var Paka = require('paka')
  , $ = Paka.$
  , CONCAT = Paka.CONCAT
  , DQ_STR = Paka.DQ_STR
  , DQ_STR = Paka.DQ_STR
  , ENCLOSED_LIST = Paka.ENCLOSED_LIST
  , EOF = Paka.EOF
  , IN = Paka.IN
  , LIST = Paka.LIST
  , NOT_IN = Paka.NOT_IN
  , OR = Paka.OR
  , REPEAT = Paka.REPEAT
  , SEQ = Paka.SEQ
  , SYM = Paka.SYM
  , OPT = Paka.OPT
  , NUM = Paka.NUM

function pass(r) { r.extra = r.children[0].extra }
function text(r) { r.extra = r.text() }
function num(r) { r.extra = Number(r.text()) }

var grammar =
    { Dockerfile: CONCAT($('FromInstruction'), REPEAT($('Instruction')), EOF)
    , Instruction: OR($('OnbuildInstruction'), $('ImmediateInstruction'))
    , FromInstruction: CONCAT('FROM', $('Image'))
    , OnbuildInstruction: CONCAT('ONBUILD', $('ImmediateInstruction'))
    , ImmediateInstruction: OR($('CommandInstruction'), $('CopyInstruction'), $('WorkdirInstruction'), $('ExposeInstruction'))
    , CommandInstruction: CONCAT(OR('RUN', 'CMD', 'ENTRYPOINT'), $('ShellCommand'))
    , CopyInstruction: CONCAT(OR('ADD', 'COPY'), $('RawStringArg'), $('RawStringArg'))
    , WorkdirInstruction: CONCAT('WORKDIR', $('RawStringArg'))
    , ExposeInstruction: CONCAT('EXPOSE', LIST($('Port'), ''))
    , Image: SEQ(OPT(SEQ($('Name'), '/')), $('Name'), OPT(SEQ(':', $('Name'))))
    , ShellCommand: OR($('Array'), $('RawString'))
    , RawStringArg: REPEAT(NOT_IN(' \n'))
    , RawString: REPEAT(NOT_IN('\n'))
    , Array: ENCLOSED_LIST('[', $('String'), ',', ']')
    , String: DQ_STR()
    , Name: REPEAT(IN('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'), 1)
    , Port: NUM()
    , Uid: NUM()
    }
  , actions =
    { Dockerfile: function(r) {
        r.extra = [r.children[0].extra]
          .concat(r.children[1].children
            .map(function(r) { return r.extra })
            .filter(Boolean))
      }
    , Instruction: pass
    , FromInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , img: r.children[1].extra
          }
      }
    , Image: function(r) {
        r.extra =
          { repo: r.children[0].length ? r.children[0].children[0].children[0].extra : null
          , name: r.children[1].text()
          , tag: r.children[2].length ? r.children[2].children[0].children[1].extra : null
          , toString: function() { return (this.repo ? this.repo + '/' : '') + this.name + (this.tag ? ':' + this.tag : '') }
          }
      }
    , Name: text
    , OnbuildInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , trigger: r.children[1].extra
          }
      }
    , ImmediateInstruction: pass
    , CopyInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , src: r.children[1].text()
          , dest: r.children[2].text()
          }
      }
    , WorkdirInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , dir: r.children[1].text()
          }
      }
    , ExposeInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , ports: r.children[1].children.map(function(port) { return port.extra })
          }
      }
    , Port: num
    , CommandInstruction: function(r) {
        r.extra =
          { cmd: r.children[0].text().toLowerCase()
          , args: r.children[1].extra
          }
      }
    , ShellCommand: pass
    , RawString: text
    , Array: function(r) {
        r.extra = r.children.map(function(r) { return r.extra })
      }
    , String: function(r) {
        r.extra = JSON.parse(r.text())
      }
    }

module.exports = Paka.create(grammar, actions)
