const MDCRipple = mdc.ripple.MDCRipple
for (const button of document.getElementsByClassName('mdc-button')) {
    new MDCRipple(button)
}
const MDCIconButtonToggle = mdc.iconButton.MDCIconButtonToggle
// const iconButtonRipple = new MDCRipple(document.querySelector('#lang'));
// iconButtonRipple.unbounded = true;
// const MDCMenu = mdc.menu.MDCMenu
// const menu = new MDCMenu(document.querySelector('.mdc-menu'))
// menu.setFixedPosition(true)
// document.querySelector('#lang').addEventListener('click', function () {
//     menu.open = true
// })

const MDCDialog = mdc.dialog.MDCDialog
const resetDialog = new MDCDialog(document.querySelector('#reset-dialog'))
const clearDialog = new MDCDialog(document.querySelector('#clear-dialog'))

const MDCSnackbar = mdc.snackbar.MDCSnackbar
const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'))

const MDCSwitch = mdc.switchControl.MDCSwitch
const exportSwitch = new MDCSwitch(
    document.querySelector('#auto-export .mdc-switch')
)
const popupSwitch = new MDCSwitch(
    document.querySelector('#show-popup .mdc-switch')
)

const MDCTextField = mdc.textField.MDCTextField
const thresholdField = new MDCTextField(
    document.querySelector('#presence-threshold .mdc-text-field')
)
const intervalField = new MDCTextField(
    document.querySelector('#reset-interval .mdc-text-field')
)

document.getElementById('version').textContent = `Version ${
    chrome.runtime.getManifest().version
}`
const openButton = document.querySelector('#open')

let presenceThreshold = 0
let resetInterval = 12
chrome.storage.local.get(
    [
        'auto-export',
        'show-popup',
        'presence-threshold',
        'reset-interval',
        'spreadsheet-id',
    ],
    function (result) {
        if (result.hasOwnProperty('auto-export')) {
            exportSwitch.checked = result['auto-export']
        } else {
            exportSwitch.checked = false
            chrome.storage.local.set({ 'auto-export': false })
        }
        if (result.hasOwnProperty('show-popup')) {
            popupSwitch.checked = result['show-popup']
        } else {
            popupSwitch.checked = true
            chrome.storage.local.set({ 'show-popup': true })
        }
        if (result.hasOwnProperty('presence-threshold')) {
            thresholdField.value = result['presence-threshold']
            presenceThreshold = result['presence-threshold']
        } else {
            thresholdField.value = 0
            chrome.storage.local.set({ 'presence-threshold': 0 })
        }
        if (result.hasOwnProperty('reset-interval')) {
            intervalField.value = result['reset-interval']
            resetInterval = result['reset-interval']
        } else {
            intervalField.value = 12
            chrome.storage.local.set({ 'reset-interval': 12 })
        }

        const id = result['spreadsheet-id']
        if (id == undefined) {
            openButton.disabled = true
        } else {
            openButton.addEventListener('click', function () {
                const url = `https://docs.google.com/spreadsheets/d/${id}`
                chrome.tabs.create({ url: url })
            })
        }
    }
)

document.querySelector('#chat').addEventListener('click', function () {
    chrome.tabs.create({
        url: 'http://pubnub.github.io/super-simple-chat/index.html',
    })
})

document.querySelector('#docs').addEventListener('click', function () {
    chrome.tabs.create({
        url: 'https://github.com/tytot/attendance-for-google-meet#usage',
    })
})
document.querySelector('#contact').addEventListener('click', function () {
    chrome.tabs.create({
        url:
            'mailto:tyleradit@gmail.com?subject=Regarding%20the%20Attendance%20for%20Google%20Meet%20Chrome%20Extension',
    })
})
document.querySelectorAll('.help').forEach((butt) => {
    const iconToggle = new MDCIconButtonToggle(butt)
    iconToggle.listen('MDCIconButtonToggle:change', (event) => {
        const description = butt.parentElement.querySelector('.description')
        if (event.detail.isOn) {
            description.classList.remove('collapsed')
        } else {
            description.classList.add('collapsed')
        }
    })
})
document.querySelector('#auto-export').addEventListener('click', function () {
    chrome.storage.local.set({ 'auto-export': exportSwitch.checked })
})
document.querySelector('#show-popup').addEventListener('click', function () {
    chrome.storage.local.set({ 'show-popup': popupSwitch.checked })
})
document
    .querySelector('#presence-threshold')
    .addEventListener('input', function () {
        if (
            thresholdField.value !== '' &&
            thresholdField.value !== presenceThreshold
        ) {
            const tempThreshold = parseFloat(thresholdField.value)
            if (isNaN(tempThreshold)) thresholdField.value = presenceThreshold
            else {
                presenceThreshold = tempThreshold
                chrome.storage.local.set({
                    'presence-threshold': presenceThreshold,
                })
            }
        }
    })
document
    .querySelector('#reset-interval')
    .addEventListener('input', function () {
        if (
            intervalField.value !== '' &&
            intervalField.value !== resetInterval
        ) {
            const tempInterval = parseFloat(intervalField.value)
            if (isNaN(tempInterval)) intervalField.value = resetInterval
            else {
                resetInterval = tempInterval
                chrome.storage.local.set({ 'reset-interval': resetInterval })
            }
        }
    })

const moreOptions = document.querySelector('#more-options')
const expandButton = document.querySelector('#expand')
expandButton.addEventListener('click', function () {
    if (moreOptions.classList.contains('collapsed')) {
        moreOptions.classList.remove('collapsed')
        expandButton.querySelector('.mdc-button__label').innerHTML =
            'Hide Advanced'
    } else {
        moreOptions.classList.add('collapsed')
        expandButton.querySelector('.mdc-button__label').innerHTML =
            'Show Advanced'
    }
})

const refreshButton = document.querySelector('#refresh')
refreshButton.addEventListener('click', function () {
    chrome.storage.local.get('last-token-refresh', function (result) {
        const unix = ~~(Date.now() / 1000)
        let valid = true
        if (result.hasOwnProperty('last-token-refresh')) {
            if (unix - result['last-token-refresh'] < 86400) {
                valid = false
            }
        }
        if (valid) {
            chrome.storage.local.set({ 'last-token-refresh': unix })
            refreshButton.disabled = true
            try {
                chrome.identity.getAuthToken(
                    { interactive: false },
                    function (token) {
                        chrome.identity.removeCachedAuthToken(
                            { token: token },
                            function () {
                                console.log(`Removed auth token ${token}.`)
                                snackbar.close()
                                snackbar.labelText =
                                    'Successfully refreshed auth token.'
                                snackbar.open()
                                refreshButton.disabled = false
                            }
                        )
                    }
                )
            } catch (error) {
                console.log(error)
                snackbar.close()
                snackbar.labelText =
                    'An error occurred while refreshing your auth token.'
                snackbar.open()
                refreshButton.disabled = false
            }
        } else {
            snackbar.close()
            snackbar.labelText =
                'Please wait until tomorrow to refresh your token again.'
            snackbar.open()
        }
    })
})

document.querySelector('#reset').addEventListener('click', function () {
    resetDialog.open()
})
document.querySelector('#confirm-reset').addEventListener('click', function () {
    chrome.storage.local.remove('spreadsheet-id', function () {
        snackbar.close()
        snackbar.labelText = 'Successfully unlinked spreadsheet.'
        snackbar.open()
        openButton.disabled = true
    })
})

document.querySelector('#clear').addEventListener('click', function () {
    clearDialog.open()
})
document.querySelector('#confirm-clear').addEventListener('click', function () {
    chrome.storage.local.get(null, function (result) {
        for (const key in result) {
            if (key !== 'spreadsheet-id') {
                chrome.storage.local.remove(key)
            }
        }
        exportSwitch.checked = false
        popupSwitch.checked = true
        thresholdField.value = 0
        intervalField.value = 12
        chrome.storage.local.set({ 'auto-export': false })
        chrome.storage.local.set({ 'show-popup': true })
        chrome.storage.local.set({ 'presence-threshold': 0 })
        chrome.storage.local.set({ 'reset-interval': 12 })
        
        snackbar.close()
        snackbar.labelText = 'Successfully cleared storage.'
        snackbar.open()

        chrome.runtime.sendMessage({
            data: 'refresh-meets',
        })
    })
})
