/*===========================================================================
Authors: BlackRogue01
Copyright: RogueSignal.io, wwww.roguesignal.io, 2023
License: MIT
===========================================================================*/
let OAudioBankVisualize = {
  render_bank(name,columns=3) {
    let bank = Object.keys(this.oa_banks[name].sounds)
    let row = 0
    let column = 0
    let grid = []
    let div = Object.assign(document.createElement('div'),{
      id: 'oa_bank_' + name,
      className: 'oa_bank',
      style: { 'z-index': 10000 }
    })
    let stop = Object.assign(document.createElement('button'),{
      id: "oa_bank_" + name + "_stop",
      className: 'oa_bank_control_button',
      onclick: function() { this.bank_stop(name) }.bind(this),
      innerHTML: 'Stop',
    })
    // div += `<button id="odemo_button_stop" class="" onclick="ob.bank_stop('main')">Stop Bank</button><p>`

    div.appendChild(stop)
    div.appendChild(document.createElement('br'))
    let button = null;

    while (bank.length > 0) {
      let key = bank.shift()
      if (!grid[row]) { grid[row] = [] }
      grid[row][column] = this.oa_banks[name].sounds[key]
      button = Object.assign(document.createElement('button'),{
        id: "oa_bank_" + name + "_" + key,
        className: 'oa_bank_button',
        onclick: function() { this.sound_play(key) }.bind(this),
        innerHTML: key,
      })
      div.appendChild(button)
      // div += `<button id="odemo_button_${key}" class="" onclick="ob.sound_play('${key}')">${key}</button>`
      column++;
      if (column > columns) { row++; column = 0; div.appendChild(document.createElement('br')) } //div += '<br>'}
    }
    document.body.prepend(div)
    return { div: div, grid: grid }
  },

  bank_css() {
    return `
    :root {
      --oa_sbfront: #1e70aa50;
      --oa_sbback: #00000050;
      --oa_mydarkblue: rgba(21, 38, 44, 0.8);
      --oa_myblue: rgba(33, 61, 69, 0.8);
      --oa_mylightblue: rgba(103, 121, 199, 0.8);
      --oa_mylightyellow: rgba(255, 179, 100, 0.8);
      --oa_myorange: rgba( 210, 61, 41, 0.8);
      --oa_myyellow: rgba(255, 159, 71, 0.8);
    }
    button.oa_bank {
      background-color: #000000;
      color: var(--oa_myyellow);
      border-radius: 10px;
      border-color: var(--oa_myorange);
      padding: 3px;
      font-size: 22px;
      min-width: 125px;
      touch-action: manipulation;
      margin:5px;
      margin-right:0px;
      margin-left:0px;
      cursor: pointer;
      vertical-align:middle;
    }
    button.oa_bank:hover {
      box-shadow: 5px 5px 5px 0px var(--oa_myorange);
    }
    `
  },
};
Object.assign(OverAudio.prototype,OAudioBankVisualize);
