;(function () {
    // initialize material design components
    const MDCRipple = mdc.ripple.MDCRipple
    const MDCList = mdc.list.MDCList
    const MDCDialog = mdc.dialog.MDCDialog
    const MDCMenu = mdc.menu.MDCMenu
    const MDCSnackbar = mdc.snackbar.MDCSnackbar
    const MDCLinearProgress = mdc.linearProgress.MDCLinearProgress
    const MDCTextField = mdc.textField.MDCTextField
    const MDCChipSet = mdc.chips.MDCChipSet

    // connect to background page
    let port = chrome.runtime.connect()

    let rostersCache = null
    let sortMethod = 'lastName'
    let classTextField, stuTextFieldEl, stuTextField, chipSetEl, chipSet

    // listen for attendance messages from inject.js
    window.addEventListener('message', function (event) {
        if (event.origin !== 'https://meet.google.com') return
        if (event.data.sender !== 'Ya boi') return
        if (event.data.attendance) {
            storeNames(event.data.attendance)
        }
    })

    document.querySelectorAll('.view-changelog').forEach((element) => {
        element.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                data: 'open-url',
                url: `https://github.com/tytot/attendance-for-google-meet/releases/tag/v${
                    chrome.runtime.getManifest().version
                }`,
            })
        })
    })
    document.querySelectorAll('.dismiss-updates').forEach((element) => {
        element.addEventListener('click', () => {
            chrome.storage.local.set({ 'updates-dismissed': true }, () => {
                document.querySelectorAll('.updates').forEach((panel) => {
                    panel.classList.add('collapsed')
                })
            })
        })
    })

    new MutationObserver(function (mutations, me) {
        if (document.querySelector('.CX8SS')) {
            chrome.runtime.sendMessage({ data: 'delete-tab' })
            chrome.storage.local.get('auto-export', function (result) {
                if (result['auto-export']) {
                    port.postMessage({ data: 'export', code: getMeetCode() })
                    Utils.log(`Exporting...`)
                }
                me.disconnect()
            })
        }
    }).observe(document.querySelector('.SSPGKf'), {
        childList: true,
        subtree: true,
    })

    const closedObserver = new MutationObserver(function (mutations, me) {
        if (
            !document.getElementsByClassName(
                'VfPpkd-Bz112c-LgbsSe yHy1rc eT1oJ IWtuld wBYOYb'
            )[0]
        ) {
            const card = document.getElementById('card')
            if (card) {
                card.style.borderRadius = '0 0 0 8px'
            }
            me.disconnect()
        }
    })

    resizeCard()
    window.addEventListener('resize', resizeCard)
    const trayObserver = new MutationObserver(resizeCard)

    let bigButtons = [...document.querySelector('.NzPR9b').children]
    bigButtons = bigButtons.filter((child) =>
        child.classList.contains('uArJ5e')
    )
    for (let i = bigButtons.length - 2; i <= bigButtons.length - 1; i++) {
        bigButtons[i].addEventListener('click', () => {
            document.getElementById('card').style.borderRadius = '8px 0 0 8px'
            closedObserver.observe(
                document.getElementsByClassName('mKBhCf')[0],
                {
                    childList: true,
                    subtree: true,
                }
            )
        })
    }

    trayObserver.observe(document.getElementsByClassName('NzPR9b')[0], {
        childList: true,
        subtree: true,
    })

    for (const helpButton of document.querySelectorAll('[aria-label="Help"]')) {
        helpButton.addEventListener('click', function () {
            chrome.runtime.sendMessage({
                data: 'open-url',
                url:
                    'https://github.com/tytot/attendance-for-google-meet#usage',
            })
        })
    }

    const attendanceButton = document.getElementById('attendance')
    attendanceButton.addEventListener('click', toggleCard)
    attendanceButton.addEventListener('keydown', function (event) {
        if (
            event.key === ' ' ||
            event.key === 'Enter' ||
            event.key === 'Spacebar'
        ) {
            toggleCard()
        }
    })

    for (const closeButton of document.getElementsByClassName('close-card')) {
        closeButton.addEventListener('click', hideCard)
    }

    const statusBar = document.getElementById('status-bar')
    const statusDetails = document.getElementById('status-details')
    const statusCountEls = statusDetails.getElementsByClassName(
        'status-details-count'
    )
    statusBar.addEventListener('click', toggleStatusDetails)
    statusBar.addEventListener('keydown', function (event) {
        if (
            event.key === ' ' ||
            event.key === 'Enter' ||
            event.key === 'Spacebar'
        ) {
            toggleStatusDetails()
        }
    })
    document
        .getElementById('hide-status-details')
        .addEventListener('click', toggleStatusDetails)

    const jumpButton = document.getElementById('status-unlisted')
    let unlistedPos = 0
    jumpButton.addEventListener('click', jumpToUnlisted)
    jumpButton.addEventListener('keydown', function (event) {
        if (
            event.key === ' ' ||
            event.key === 'Enter' ||
            event.key === 'Spacebar'
        ) {
            jumpToUnlisted()
        }
    })

    const rosterStatus = document.getElementById('roster-status')

    const exportButton = document.getElementById('export')
    exportButton.addEventListener('click', function () {
        port.postMessage({ data: 'export', code: getMeetCode() })
        exportButton.disabled = true
        Utils.log(`Exporting...`)
    })

    const classList = new MDCList(document.querySelector('#class-list'))
    classList.singleSelection = true
    const selectButton = document.getElementById('select-button')
    document
        .querySelector('#dialog-content')
        .addEventListener('click', function () {
            if (classList.selectedIndex === -1) {
                selectButton.disabled = true
            } else {
                selectButton.disabled = false
            }
        })

    const selectDialog = new MDCDialog(document.getElementById('select'))
    chrome.storage.local.get(null, function (result) {
        const code = getMeetCode()
        let showDialog = false
        if (!result.hasOwnProperty(code)) {
            // add data boilerplate for this Meet to local storage
            chrome.storage.local.set({
                [code]: {
                    attendance: {},
                    'start-timestamp': ~~(Date.now() / 1000),
                },
            })
            if (result['show-popup']) {
                showDialog = true

                selectDialog.open()
                selectDialog.scrimClickAction = ''
                selectDialog.escapeKeyAction = ''
                selectDialog.autoStackButtons = false
                selectDialog.listen('MDCDialog:closed', (event) => {
                    initCard()
                })
    
                prepareChips(null, 'dialog-default-view', 'dialog-edit-view')
    
                document.getElementById('later').addEventListener('click', () => {
                    document.getElementById('card-class-view').hidden = false
                    document.getElementById('card-default-view').hidden = true
                })
                selectButton.addEventListener('click', () => {
                    const className =
                        classList.listElements[classList.selectedIndex].name
                    const code = getMeetCode()
                    chrome.storage.local.get(code, function (result) {
                        let res = result[code]
                        res.class = className
                        chrome.storage.local.set({ [code]: res })
                        document.getElementById(
                            'class-label'
                        ).textContent = className
                    })
                })
                document
                    .getElementById('cancel-class')
                    .addEventListener('click', function () {
                        document.getElementById(
                            'dialog-default-view'
                        ).hidden = false
                        document.getElementById('dialog-edit-view').hidden = true
                    })
            }
        }
        if (!showDialog) {
            document.getElementById('card-class-view').hidden = false
            document.getElementById('card-default-view').hidden = true
            initCard()
        }
    })

    const confirmDeleteDialog = new MDCDialog(
        document.getElementById('delete-dialog')
    )
    const deleteButton = document.getElementById('confirm-delete')
    confirmDeleteDialog.listen('MDCDialog:opening', (event) => {
        document.getElementById(
            'delete-dialog-content'
        ).textContent = `Are you sure you want to delete the class ${deleteButton.classToDelete}?`
    })
    deleteButton.addEventListener('click', function () {
        const className = deleteButton.classToDelete
        deleteClass(className)
        classList.selectedIndex = -1
        selectButton.disabled = true
        snackbar.labelText = `Successfully deleted class ${className}.`
        removeSnackbarButtons()
        snackbar.open()
    })

    const sortMenuEl = document.getElementById('sort-menu')
    const sortMenu = new MDCMenu(sortMenuEl)
    document.querySelector('.more').addEventListener('click', function () {
        sortMenu.open = true
    })
    const sortOptions = new MDCList(sortMenuEl.querySelector('.mdc-list'))
    for (const listEl of sortOptions.listElements) {
        new MDCRipple(listEl)
        listEl.addEventListener('click', function () {
            sortMethod = listEl.id
            forceStatusUpdate()
        })
    }

    const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'))

    const sbHelp = document.getElementById('snackbar-help')
    sbHelp.addEventListener('click', troubleshoot)
    const sbOpen = document.getElementById('snackbar-open')
    sbOpen.addEventListener('click', openSpreadsheet)
    const sbUndo = document.getElementById('snackbar-undo')
    sbUndo.addEventListener('click', undo)

    const linearProgress = new MDCLinearProgress(
        document.querySelector('#progress-bar')
    )
    linearProgress.progress = 0
    port.onMessage.addListener(function (msg) {
        linearProgress.progress = msg.progress
        if (msg.done) {
            removeSnackbarButtons()
            exportButton.disabled = false
            const error = msg.error
            if (error) {
                snackbar.labelText = error
                sbHelp.style.display = 'inline-flex'
            } else {
                snackbar.labelText = 'Successfully exported to Google Sheets™!'
                sbOpen.style.display = 'inline-flex'
            }
            snackbar.close()
            snackbar.open()
        }
    })

    document
        .getElementById('default-back')
        .addEventListener('click', function () {
            document.getElementById('card-class-view').hidden = false
            document.getElementById('card-default-view').hidden = true
        })

    document.getElementById('edit-back').addEventListener('click', function () {
        const cardTitle = document.getElementById('class-label')
        if (classTextField.initValue === '') {
            document.getElementById('card-class-view').hidden = false
        } else {
            document.getElementById('card-default-view').hidden = false
            cardTitle.textContent = classTextField.value
        }
        document.getElementById('card-edit-view').hidden = true
    })

    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 8 || event.key === 'Backspace') {
            const chips = chipSet.chips
            if (chips.length > 0) {
                const chipAction = chips[chips.length - 1].root.querySelector(
                    '.mdc-chip__primary-action'
                )
                const chipClose = chips[chips.length - 1].root.querySelector(
                    '.mdc-chip__icon--trailing'
                )
                const activeEl = document.activeElement
                if (activeEl === chipAction) {
                    chipClose.focus()
                } else if (activeEl === chipClose) {
                    removeChip()
                }
            }
        }
    })

    for (const button of document.getElementsByClassName('mdc-button')) {
        new MDCRipple(button)
    }
    for (const button of document.getElementsByClassName('mdc-icon-button')) {
        const ripple = new MDCRipple(button)
        ripple.unbounded = true
    }

    function getMeetCode() {
        return document
            .getElementsByTagName('c-wiz')[0]
            .getAttribute('data-unresolved-meeting-id')
    }

    function resizeCard() {
        const tray = document.getElementsByClassName('NzPR9b')[0]
        if (tray) {
            const trayWidth = tray.offsetWidth
            document.getElementById('card').style.width = trayWidth + 'px'
        }
    }

    function removeSnackbarButtons() {
        sbHelp.style.display = 'none'
        sbOpen.style.display = 'none'
        sbUndo.style.display = 'none'
    }

    function storeNames(names) {
        const code = getMeetCode()
        chrome.storage.local.get(null, function (result) {
            const timestamp = ~~(Date.now() / 1000)
            let codesToDelete = []
            for (const key in result) {
                const data = result[key]
                if (data.hasOwnProperty('timestamp')) {
                    if (
                        timestamp - data.timestamp >=
                        result['reset-interval'] * 3600
                    ) {
                        codesToDelete.push(key)
                        if (key !== code) {
                            chrome.storage.local.remove([key])
                            delete result[key]
                        } else {
                            result[key] = {
                                attendance: {},
                                'start-timestamp': timestamp,
                            }
                        }
                    }
                }
            }
            if (codesToDelete.length > 0) {
                port.postMessage({
                    data: 'delete-meta',
                    codes: codesToDelete,
                })
            }

            if (!result.hasOwnProperty(code)) {
                result[code] = {
                    attendance: {},
                    'start-timestamp': timestamp,
                }
            }
            const res = result[code]
            let currentData = res.attendance
            res.timestamp = timestamp

            for (const name of names) {
                if (currentData[name] == undefined) {
                    currentData[name] = [timestamp]
                } else if (currentData[name].length % 2 === 0) {
                    currentData[name].push(timestamp)
                }
                if (names.includes(name)) {
                    if (currentData[name].length % 2 === 0) {
                        currentData[name].push(timestamp)
                    }
                } else {
                    if (currentData[name].length % 2 === 1) {
                        currentData[name].push(timestamp)
                    }
                }
            }
            for (const name in currentData) {
                if (!names.includes(name) && currentData[name]) {
                    if (currentData[name].length % 2 === 1) {
                        currentData[name].push(timestamp)
                    }
                }
            }

            const className = res.class
            if (className) {
                updateRosterStatus(
                    currentData,
                    result.rosters,
                    className,
                    result['presence-threshold']
                )
            }

            chrome.storage.local.set({ [code]: res })
        })
    }

    function updateRosterStatus(
        attendance,
        rosters,
        className,
        presenceThreshold = 0
    ) {
        rosterStatus.innerHTML = ''

        const roster = rosters[className]
        if (roster.length === 0) {
            document.querySelector('#no-students').style.display = 'flex'
        } else {
            document.querySelector('#no-students').style.display = 'none'
        }
        let entries = []
        const statusCounts = {
            red: 0,
            yellow: 0,
            green: 0,
            gray: 0,
        }
        let changed = false
        for (const name in attendance) {
            const timestamps = attendance[name]
            let found = false
            let i = 0
            while (!found && i < roster.length) {
                const testName = roster[i]
                if (
                    testName.replace('|', ' ').trim().toLocaleUpperCase() ===
                    name.replace('|', ' ').trim().toLocaleUpperCase()
                ) {
                    found = true
                    const minsPresent = Utils.minsPresent(timestamps)
                    if (minsPresent >= presenceThreshold) {
                        if (timestamps.length % 2 === 1) {
                            entries.push({
                                name: name,
                                color: 'green',
                                tooltip: 'Present',
                                icon: 'check_circle',
                                text: `Joined at ${Utils.toTimeString(
                                    timestamps[0]
                                )}`,
                                index: 2,
                            })
                            statusCounts.green++
                        } else {
                            entries.push({
                                name: name,
                                color: 'yellow',
                                tooltip: 'Previously Present',
                                icon: 'watch_later',
                                text: `Last seen at ${Utils.toTimeString(
                                    timestamps[timestamps.length - 1]
                                )}`,
                                index: 1,
                            })
                            statusCounts.yellow++
                        }
                    } else {
                        entries.push({
                            name: name,
                            color: 'red',
                            tooltip: 'Absent',
                            icon: 'cancel',
                            text: `Joined at ${Utils.toTimeString(
                                timestamps[0]
                            )}`,
                            index: 0,
                        })
                        statusCounts.red++
                    }
                    if (testName !== name) {
                        roster[i] = name
                        if (!changed) {
                            changed = true
                        }
                    }
                }
                i++
            }
            if (!found) {
                entries.push({
                    name: name,
                    color: 'gray',
                    tooltip: 'Not on List',
                    icon: 'error',
                    text: `Joined at ${Utils.toTimeString(timestamps[0])}`,
                    index: -1,
                })
                statusCounts.gray++
            }
        }
        if (changed) {
            chrome.storage.local.set({ rosters: rosters })
        }
        const bigAttendance = Object.keys(attendance).map((key) =>
            key.toLocaleUpperCase()
        )
        for (const name of roster) {
            if (!bigAttendance.includes(name.toLocaleUpperCase())) {
                entries.push({
                    name: name,
                    color: 'red',
                    tooltip: 'Absent',
                    icon: 'cancel',
                    text: 'Not here',
                    index: 0,
                })
                statusCounts.red++
            }
        }

        if (sortMethod === 'firstName') {
            var compare = (a, b) => {
                if ((a.index === -1) !== (b.index === -1)) {
                    return b.index - a.index
                }
                return Utils.compareFirst(a.name, b.name)
            }
        } else if (sortMethod === 'lastName') {
            compare = (a, b) => {
                if ((a.index === -1) !== (b.index === -1)) {
                    return b.index - a.index
                }
                return Utils.compareLast(a.name, b.name)
            }
        } else if (sortMethod === 'presentFirst') {
            compare = (a, b) => {
                return b.index - a.index
            }
        } else {
            compare = (a, b) => {
                if ((a.index === -1) !== (b.index === -1)) {
                    return b.index - a.index
                }
                return a.index - b.index
            }
        }
        entries.sort(compare)

        if (
            statusCounts.gray === 0 &&
            jumpButton.classList.contains('mdc-ripple-surface')
        ) {
            jumpButton.classList.remove('mdc-ripple-surface')
            jumpButton.setAttribute('aria-disabled', true)
            jumpButton.style.cursor = 'default'
            jumpButton.removeAttribute('jscontroller')
        }
        entries.forEach((entry, index) => {
            if (entry.index === -1) {
                var metaIcon = 'add_circle'
                var metaTooltip = 'Add to Class'
                if (index === 0 || entries[index - 1].index !== -1) {
                    rosterStatus.insertAdjacentHTML(
                        'beforeend',
                        `<li class="mdc-list-divider" role="separator"></li>
                        <li id="unlisted-divider">
                            Not on List
                            <button id="add-all-unlisted" class="mdc-button">
                                <span class="mdc-button__ripple"></span>
                                <span class="mdc-button__label">Add All</span>
                            </button>
                        </li>`
                    )
                    unlistedPos = 61 * index
                    if (!jumpButton.classList.contains('mdc-ripple-surface')) {
                        jumpButton.classList.add('mdc-ripple-surface')
                        jumpButton.setAttribute('aria-disabled', false)
                        jumpButton.style.cursor = 'pointer'
                        jumpButton.setAttribute('jscontroller', 'VXdfxd')
                    }
                    document
                        .getElementById('add-all-unlisted')
                        .addEventListener('click', function () {
                            removeSnackbarButtons()
                            rostersCache = rosters
                            const nons = entries
                                .filter((entry) => entry.index === -1)
                                .map((non) => non.name)
                            addBulkStudents(nons)
                            snackbar.labelText = `Added ${nons.length} student${
                                nons.length === 1 ? '' : 's'
                            } to class.`
                            sbUndo.style.display = 'inline-flex'
                            snackbar.close()
                            snackbar.open()
                        })
                }
            } else {
                metaIcon = 'remove_circle'
                metaTooltip = 'Remove from Class'
            }
            var meta = `<div class="mdc-list-item__meta">
                <button
                    class="mdc-icon-button material-icons medium-button"
                    aria-label="${metaTooltip}"
                    jscontroller="VXdfxd"
                    jsaction="mouseenter:tfO1Yc; mouseleave:JywGue;"
                    tabindex="0"
                    data-tooltip="${metaTooltip}"
                    data-tooltip-vertical-offset="-12"
                    data-tooltip-horizontal-offset="0"
                >
                    ${metaIcon}
                </button>
            </div>`
            const realName = entry.name.replace('|', ' ').trim()
            rosterStatus.insertAdjacentHTML(
                'beforeend',
                `<li class="mdc-list-divider" role="separator"></li>
                <li class="mdc-list-item" tabindex="0">
                    <span
                        class="mdc-list-item__graphic material-icons ${entry.color}"
                        jscontroller="VXdfxd"
                        jsaction="mouseenter:tfO1Yc; mouseleave:JywGue;"
                        tabindex="0"
                        aria-label="${entry.tooltip}"
                        data-tooltip="${entry.tooltip}"
                        data-tooltip-vertical-offset="-12"
                        data-tooltip-horizontal-offset="0"
                    >
                        ${entry.icon}
                    </span>
                    <span class="mdc-list-item__text">
                        <span class="mdc-list-item__primary-text">
                            ${realName}
                        </span>
                        <span class="mdc-list-item__secondary-text">
                            ${entry.text}
                        </span>
                    </span>
                    ${meta}
                </li>`
            )
            const metaButton = rosterStatus.lastChild.querySelector(
                '.mdc-icon-button'
            )
            if (entry.index === -1) {
                metaButton.addEventListener('click', function () {
                    removeSnackbarButtons()
                    rostersCache = rosters
                    addStudent(entry.name)
                    snackbar.labelText = `Added ${realName} to class.`
                    sbUndo.style.display = 'inline-flex'
                    snackbar.close()
                    snackbar.open()
                })
            } else {
                metaButton.addEventListener('click', function () {
                    removeSnackbarButtons()
                    rostersCache = rosters
                    removeStudent(entry.name)
                    snackbar.labelText = `Removed ${realName} from class.`
                    sbUndo.style.display = 'inline-flex'
                    snackbar.close()
                    snackbar.open()
                })
            }
        })
        if (roster.length > 0)
            rosterStatus.removeChild(rosterStatus.firstElementChild)

        if (roster.length !== 0) {
            ;['green', 'yellow', 'red'].forEach(function (color, index) {
                const bar = document.getElementById(`status-${color}`)
                bar.style.width = `${
                    (100 * statusCounts[color]) / roster.length
                }%`
                const prefix = bar.getAttribute('aria-label').split(':')[0]
                bar.setAttribute(
                    'aria-label',
                    `${prefix}: ${statusCounts[color]}/${roster.length}`
                )
                statusCountEls[index].innerHTML = `<b>${statusCounts[color]
                    .toString()
                    .padStart(roster.length.toString().length, '0')}</b>/${
                    roster.length
                }`
            })
        }
        statusCountEls[3].innerHTML = `<b>${statusCounts.gray}</b>`
    }

    function troubleshoot() {
        chrome.runtime.sendMessage({
            data: 'open-url',
            url:
                'https://github.com/tytot/attendance-for-google-meet#troubleshoot',
        })
    }

    function openSpreadsheet() {
        chrome.storage.local.get('spreadsheet-id', function (result) {
            const id = result['spreadsheet-id']
            const url = `https://docs.google.com/spreadsheets/d/${id}`
            chrome.runtime.sendMessage({
                data: 'open-url',
                url: url,
            })
        })
    }

    function initCard() {
        const element = document.getElementById('select')
        element.parentNode.removeChild(element)
        prepareChips('card-class-view', 'card-default-view', 'card-edit-view')
        forceStatusUpdate()
    }

    function toggleCard() {
        if (document.getElementById('card').classList.contains('collapsed')) {
            showCard()
        } else {
            hideCard()
        }
    }

    function showCard() {
        document.getElementsByClassName('NzPR9b')[0].style.borderRadius = '0px'
        const attendanceButton = document.getElementById('attendance')
        attendanceButton.classList.remove('IeuGXd')
        document.getElementById('card').classList.remove('collapsed')
    }

    function hideCard() {
        setTimeout(() => {
            document.getElementsByClassName('NzPR9b')[0].style.borderRadius =
                '0 0 0 8px'
        }, 250)
        const attendanceButton = document.getElementById('attendance')
        attendanceButton.classList.add('IeuGXd')
        document.getElementById('card').classList.add('collapsed')
    }

    function toggleStatusDetails() {
        const expanded = statusBar.getAttribute('aria-expanded') === 'true'
        statusBar.setAttribute('aria-pressed', !expanded)
        statusBar.setAttribute('aria-expanded', !expanded)
        if (!expanded) {
            statusDetails.classList.remove('collapsed')
            statusBar.setAttribute('data-tooltip', 'Hide Status Details')
            statusBar.setAttribute('aria-label', 'Hide Status Details')
        } else {
            statusDetails.classList.add('collapsed')
            statusBar.setAttribute('data-tooltip', 'Show Status Details')
            statusBar.setAttribute('aria-label', 'Show Status Details')
        }
    }

    function jumpToUnlisted() {
        if (jumpButton.classList.contains('mdc-ripple-surface')) {
            rosterStatus.parentElement.scrollTop = unlistedPos
        }
    }

    function getClassHTML(className) {
        return `<li
            class="mdc-list-item mdc-list-item--class"
            role="option"
            tabindex="0"
        >
            <span class="mdc-list-item__ripple"></span>
            <span
                class="mdc-list-item__graphic material-icons"
                aria-hidden="true"
            >
                perm_identity
            </span>
            <span class="mdc-list-item__text class-entry">
                ${className}
            </span>
            <div class="mdc-list-item__meta">
                <button
                    class="mdc-icon-button material-icons medium-button edit-class"
                    aria-label="Edit"
                    jscontroller="VXdfxd"
                    jsaction="mouseenter:tfO1Yc; mouseleave:JywGue;"
                    tabindex="0"
                    data-tooltip="Edit"
                    data-tooltip-vertical-offset="-12"
                    data-tooltip-horizontal-offset="0"
                >
                    edit
                </button>
                <button
                    class="mdc-icon-button material-icons medium-button delete-class"
                    aria-label="Delete"
                    jscontroller="VXdfxd"
                    jsaction="mouseenter:tfO1Yc; mouseleave:JywGue;"
                    tabindex="0"
                    data-tooltip="Delete"
                    data-tooltip-vertical-offset="-12"
                    data-tooltip-horizontal-offset="0"
                >
                    delete
                </button>
            </div>
        </li>`
    }

    function initializeClasses() {
        return new Promise((resolve) => {
            chrome.storage.local.get('rosters', function (result) {
                let res = result['rosters']
                if (res == undefined) {
                    res = {}
                    chrome.storage.local.set({ rosters: res })
                }

                const classList = document.getElementById('class-list')
                let classes = []
                for (const className in res) {
                    classList.insertAdjacentHTML(
                        'beforeend',
                        getClassHTML(className)
                    )
                    const classEl = classList.lastChild
                    classEl.name = className
                    classEl.roster = res[className]
                    classes.push(classEl)
                }
                if (classes.length === 0) {
                    document.querySelector('#no-classes').style.display = 'flex'
                }
                resolve(classes)
            })
        })
    }

    function undo() {
        return new Promise((resolve) => {
            if (rostersCache == null) {
                resolve()
            }
            chrome.storage.local.set({ rosters: rostersCache }, function () {
                forceStatusUpdate()
                snackbar.labelText = 'Undo successful.'
                removeSnackbarButtons()
                snackbar.open()
                resolve()
            })
        })
    }

    function addClass(className, roster) {
        return new Promise((resolve) => {
            chrome.storage.local.get('rosters', function (result) {
                let res = result['rosters']
                res[className] = roster
                chrome.storage.local.set({ rosters: res })

                const classList = document.getElementById('class-list')
                classList.insertAdjacentHTML(
                    'beforeend',
                    getClassHTML(className)
                )
                const classEl = classList.lastChild
                classEl.name = className
                classEl.roster = res[className]

                document.querySelector('#no-classes').style.display = 'none'

                resolve(classEl)
            })
        })
    }

    // function addClass(className, roster) {
    //     return new Promise((resolve, reject) => {
    //         writeRostersWithSplit(className, [roster])
    //             .then((response) => {
    //                 console.log(response)

    //                 const classList = document.getElementById('class-list')
    //                 classList.insertAdjacentHTML(
    //                     'beforeend',
    //                     getClassHTML(className)
    //                 )
    //                 const classEl = classList.lastChild
    //                 classEl.name = className
    //                 classEl.roster = roster
    //                 document.querySelector('#no-classes').style.display = 'none'

    //                 resolve(classEl)
    //             })
    //             .catch((error) => {
    //                 console.log(error)
    //                 reject(error)
    //             })
    //     })
    // }

    // function writeRostersWithSplit(className, rosterSet) {
    //     console.log(rosterSet)
    //     return new Promise((resolve, reject) => {
    //         chrome.storage.local.get('rosters', function (result) {
    //             let res = result['rosters']
    //             for (let i = 0; i < rosterSet.length; i++) {
    //                 if (i === 0) {
    //                     res[className] = rosterSet[i]
    //                 } else {
    //                     res[`${className}°${i}`] = rosterSet[i]
    //                 }
    //             }
    //             chrome.storage.local.set({ rosters: res }, function () {
    //                 if (chrome.runtime.lastError) {
    //                     if (
    //                         chrome.runtime.lastError.message.startsWith(
    //                             'QUOTA_BYTES_PER_ITEM'
    //                         ) && rosterSet.length <= 16
    //                     ) {
    //                         writeRostersWithSplit(
    //                             className,
    //                             rosterSet
    //                                 .map((subRoster) => {
    //                                     const half = Math.ceil(
    //                                         subRoster.length / 2
    //                                     )
    //                                     return [
    //                                         subRoster.splice(0, half),
    //                                         subRoster.splice(-half),
    //                                     ]
    //                                 })
    //                                 .flat()
    //                         ).then(resolve)
    //                     } else {
    //                         reject(chrome.runtime.lastError)
    //                     }
    //                 } else {
    //                     resolve()
    //                 }
    //             })
    //         })
    //     })
    // }

    function updateClass(className, roster, set = false) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, function (result) {
                let res = result['rosters']
                res[className] = roster
                chrome.storage.local.set({ rosters: res })
                if (set) {
                    const code = getMeetCode()
                    result[code].class = className
                    chrome.storage.local.set({ [code]: result[code] })
                }
                const classList = document.getElementById('class-list')
                const classEls = classList.getElementsByTagName('li')
                for (const classEl of classEls) {
                    if (classEl.name === className) {
                        classEl.roster = roster
                        break
                    }
                }
                resolve()
            })
        })
    }

    function updateAndRenameClass(
        oldClassName,
        newClassName,
        roster,
        set = false
    ) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, function (result) {
                let res = result['rosters']
                res[newClassName] = roster
                delete res[oldClassName]
                chrome.storage.local.set({ rosters: res })
                const code = getMeetCode()
                if (set) {
                    result[code].class = newClassName
                    chrome.storage.local.set({ [code]: result[code] })
                }
                for (const key in result) {
                    const data = result[key]
                    if (key !== code && data.hasOwnProperty('timestamp')) {
                        data.class = newClassName
                        chrome.storage.local.set({ [key]: data })
                    }
                }
                const classList = document.getElementById('class-list')
                const classEls = classList.getElementsByTagName('li')
                for (const classEl of classEls) {
                    if (classEl.name === oldClassName) {
                        classEl.name = newClassName
                        classEl.roster = roster
                        classEl.querySelector(
                            '.class-entry'
                        ).textContent = newClassName
                        break
                    }
                }
                resolve()
            })
        })
    }

    function deleteClass(className) {
        return new Promise((resolve) => {
            chrome.storage.local.get(null, function (result) {
                let res = result['rosters']
                delete res[className]
                chrome.storage.local.set({ rosters: res })

                for (const key of Object.keys(result)) {
                    if (
                        result[key].hasOwnProperty('class') &&
                        typeof result[key].class === 'string' &&
                        result[key].class === className
                    ) {
                        delete result[key]['class']
                        chrome.storage.local.set({ [key]: result[key] })
                    }
                }
                const classList = document.getElementById('class-list')
                const classEls = classList.getElementsByTagName('li')
                for (const classEl of classEls) {
                    if (classEl.name === className) {
                        classList.removeChild(classEl)
                        break
                    }
                }
                if (Object.keys(res).length === 0) {
                    document.querySelector('#no-classes').style.display = 'flex'
                }
                resolve()
            })
        })
    }

    function addStudent(name) {
        chrome.storage.local.get(null, function (result) {
            const code = getMeetCode()
            const className = result[code].class
            let res = result.rosters
            res[className].push(name)
            chrome.storage.local.set({ rosters: res })
            updateRosterStatus(
                result[code].attendance,
                res,
                className,
                result['presence-threshold']
            )
        })
    }

    function addBulkStudents(names) {
        chrome.storage.local.get(null, function (result) {
            const code = getMeetCode()
            const className = result[code].class
            let res = result.rosters
            names.forEach((name) => {
                res[className].push(name)
            })
            chrome.storage.local.set({ rosters: res })
            updateRosterStatus(
                result[code].attendance,
                res,
                className,
                result['presence-threshold']
            )
        })
    }

    function removeStudent(name) {
        chrome.storage.local.get(null, function (result) {
            const code = getMeetCode()
            const className = result[getMeetCode()].class
            let res = result.rosters
            res[className] = res[className].filter((n) => n !== name)
            chrome.storage.local.set({ rosters: res })
            updateRosterStatus(
                result[code].attendance,
                res,
                className,
                result['presence-threshold']
            )
        })
    }

    function forceStatusUpdate() {
        chrome.storage.local.get(null, function (result) {
            const res = result[getMeetCode()]
            const className = res.class
            if (className) {
                updateRosterStatus(
                    res.attendance,
                    result.rosters,
                    className,
                    result['presence-threshold']
                )
            }
        })
    }

    function editClass(className, roster) {
        classTextField.value = className
        classTextField.initValue = className
        chipSetEl.innerHTML = ''
        chipSet = new MDCChipSet(chipSetEl)
        for (const name of roster) {
            addChip(name.replace('|', ' ').trim())
        }
        stuTextField.value = getNewFieldValue()
    }

    function addChip(name) {
        const chipEl = document.createElement('div')
        chipEl.className = 'mdc-chip'
        chipEl.setAttribute('role', 'row')
        chipEl.innerHTML = `<div class="mdc-chip__ripple"></div>
        <span role="gridcell">
            <span role="button" tabindex="0" class="mdc-chip__primary-action">
                <span class="mdc-chip__text">${name}</span>
            </span>
            <span role="gridcell">
                <i
                    class="material-icons mdc-chip__icon mdc-chip__icon--trailing"
                    tabindex="0"
                    role="button"
                    style="margin-left: 0;"
                    >cancel</i
                >
            </span>
        </span>`
        chipSetEl.appendChild(chipEl)
        chipSet.addChip(chipEl)

        chipEl
            .querySelector('.mdc-chip__icon')
            .addEventListener('click', function () {
                removeChip(name)
            })
    }

    function removeChip(name) {
        const nameArray = chipSet.chips.map((chip) =>
            chip.root.outerText.replace('cancel', '').trim()
        )
        if (name) {
            var i = nameArray.indexOf(name)
        } else {
            i = nameArray.length - 1
        }
        const chip = chipSet.chips[i]
        chip.beginExit()
        stuTextField.value = getNewFieldValue(true)
    }

    function prepareChips(_cardView, defaultView, editView) {
        cardView = _cardView || defaultView
        const textFields = document.getElementsByClassName('mdc-text-field')
        classTextField = new MDCTextField(textFields[0])
        stuTextFieldEl = textFields[1]
        stuTextField = new MDCTextField(stuTextFieldEl)
        chipSetEl = document.getElementsByClassName('mdc-chip-set')[0]
        chipSet = new MDCChipSet(chipSetEl)

        initializeClasses().then((classes) => {
            for (const classEl of classes) {
                addDefaultEventListeners(
                    classEl,
                    cardView,
                    defaultView,
                    editView,
                    _cardView
                )
                new MDCRipple(classEl)
            }
        })

        document
            .getElementById('addeth-class')
            .addEventListener('click', function () {
                document.getElementById('class-label').adding = true
                document.getElementById(cardView).hidden = true
                document.getElementById(editView).hidden = false
                editClass('', [])
            })

        document
            .getElementById('save-class')
            .addEventListener('click', function () {
                const className = classTextField.value
                const initClassName = classTextField.initValue

                chrome.storage.local.get('rosters', async function (result) {
                    let res = result['rosters']
                    removeSnackbarButtons()
                    if (className === '') {
                        snackbar.labelText =
                            'Error: The class name cannot be empty.'
                        snackbar.close()
                        snackbar.open()
                    } else if (className.includes('§')) {
                        snackbar.labelText =
                            'Error: The class name cannot contain the character §.'
                        snackbar.close()
                        snackbar.open()
                    } else if (
                        res.hasOwnProperty(className) &&
                        className !== initClassName
                    ) {
                        snackbar.labelText =
                            'Error: You already have a class with that name.'
                        snackbar.close()
                        snackbar.open()
                    } else {
                        const nameArray = chipSet.chips.map((chip) =>
                            chip.root.outerText.replace('cancel', '').trim()
                        )
                        delete classTextField.initValue
                        if (initClassName === '') {
                            const classEl = await addClass(className, nameArray)
                            new MDCRipple(classEl)
                            addDefaultEventListeners(
                                classEl,
                                cardView,
                                defaultView,
                                editView,
                                _cardView
                            )
                            document.getElementById(cardView).hidden = false
                            document.getElementById(editView).hidden = true
                        } else {
                            if (initClassName !== className) {
                                await updateAndRenameClass(
                                    initClassName,
                                    className,
                                    nameArray,
                                    !selectDialog.isOpen
                                )
                                port.postMessage({
                                    data: 'rename',
                                    code: getMeetCode(),
                                    oldClassName: initClassName,
                                    newClassName: className,
                                })
                            } else {
                                await updateClass(
                                    className,
                                    nameArray,
                                    !selectDialog.isOpen
                                )
                            }
                            const cardTitle = document.getElementById(
                                'class-label'
                            )
                            cardTitle.textContent = className
                            document.getElementById(defaultView).hidden = false
                            document.getElementById(editView).hidden = true
                            forceStatusUpdate()
                        }
                        if (selectButton) {
                            selectButton.disabled = true
                        }

                        snackbar.labelText = `Successfully saved class ${className}.`
                        snackbar.close()
                        snackbar.open()
                    }
                })
            })

        document
            .getElementById('edit-roster')
            .addEventListener('click', function () {
                chrome.storage.local.get(null, function (result) {
                    let res = result[getMeetCode()]
                    const className = res.class
                    try {
                        document.getElementById(defaultView).hidden = true
                        document.getElementById(editView).hidden = false
                    } catch {}
                    editClass(className, Array.from(result.rosters[className]))
                })
            })

        stuTextFieldEl.addEventListener('input', function (event) {
            const rawInput = stuTextField.value
            const input = rawInput.trimLeft()
            const newValue = getNewFieldValue()
            if (rawInput + ' ' === newValue) {
                const chips = chipSet.chips
                const chipAction = chips[chips.length - 1].root.querySelector(
                    '.mdc-chip__primary-action'
                )
                chipAction.focus()
                stuTextField.value = newValue
            } else {
                if (input.includes('\n')) {
                    let names = input
                        .split(/\r?\n/)
                        .map((name) => name.trim().replace(/\s+/g, ' '))
                        .filter((name) => name !== '')
                    for (const name of names) {
                        addChip(name)
                    }
                    stuTextField.value = getNewFieldValue()
                } else {
                    stuTextField.value = newValue + input
                }
            }
        })

        const input = document.getElementsByClassName(
            'mdc-text-field__input'
        )[1]
        input.addEventListener('scroll', function () {
            const scrollY = input.scrollTop
            chipSetEl.style.top = '-' + scrollY + 'px'
        })
    }

    function addDefaultEventListeners(
        classEl,
        cardView,
        defaultView,
        editView,
        clickable
    ) {
        if (clickable) {
            classEl.addEventListener('click', function (event) {
                const target = event.target
                if (
                    !target.classList.contains('edit-class') &&
                    !target.classList.contains('delete-class')
                ) {
                    const code = getMeetCode()
                    chrome.storage.local.get(null, function (result) {
                        const res = result[code]
                        res.class = classEl.name
                        chrome.storage.local.set({ [code]: res })

                        document.getElementById(cardView).hidden = true
                        document.getElementById(defaultView).hidden = false

                        document.getElementById('class-label').textContent =
                            classEl.name

                        updateRosterStatus(
                            res.attendance,
                            result.rosters,
                            res.class,
                            result['presence-threshold']
                        )
                        rosterStatus.parentElement.scrollTop = 0
                    })
                }
            })
        }
        classEl
            .querySelector('.delete-class')
            .addEventListener('click', function () {
                deleteButton.classToDelete = classEl.name
                confirmDeleteDialog.open()
            })
        classEl
            .querySelector('.edit-class')
            .addEventListener('click', function () {
                document.getElementById(cardView).hidden = true
                document.getElementById(defaultView).hidden = true
                document.getElementById(editView).hidden = false
                editClass(classEl.name, Array.from(classEl.roster))
            })
    }

    function getNewFieldValue(removal = false) {
        const chipRows = (chipSetEl.offsetHeight - 8) / 40

        let newValue = ''
        for (let i = 0; i < chipRows - 1; i++) {
            newValue += ' '.repeat(100) + '\n'
        }

        let lastHeight = -1
        let counter = 0
        let chips = chipSet.chips.map((chip) => chip.root)
        if (removal) {
            chips.pop()
        }
        for (let i = chips.length - 1; i >= 0; i--) {
            const chip = chips[i]
            const top = chip.getBoundingClientRect().top
            if (lastHeight != -1 && Math.abs(top - lastHeight) > 10) {
                break
            }
            lastHeight = top
            const text = chip.querySelector('.mdc-chip__text').innerHTML
            for (let i = 0; i < text.length + 7; i++) {
                counter++
            }
        }
        newValue += ' '.repeat(Math.max(0, counter - 1))
        return newValue
    }
})()
