const { WhatsAppInstance } = require('../class/instance')
const fs = require('fs')
const path = require('path')
const config = require('../../config/config')
const { Session } = require('../class/session')

exports.init = async (req, res) => {
    // MY CODE

    const { restaurant, greetingMessage, workTime } = req.body

    if (restaurant === '' || !restaurant) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Restaurant field is missing',
        })
    }

    if (greetingMessage === '' || !greetingMessage) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Greeting Message field is missing',
        })
    }

    if (workTime.length < 7) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'You forgot to send some field in worktime array',
        })
    }

    if (workTime.length > 7) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'You send too much fields in worktime array',
        })
    }

    // END OF MY CODE
    const key = null
    const webhook = !req.query.webhook ? false : req.query.webhook
    const webhookUrl = !req.query.webhookUrl ? null : req.query.webhookUrl
    const appUrl = config.appUrl || req.protocol + '://' + req.headers.host
    const instance = new WhatsAppInstance(key, webhook, webhookUrl, req.body)

    const data = await instance.init()
    WhatsAppInstances[data.key] = instance
    res.json({
        error: false,
        message: 'Initializing successfully',
        restaurant: data.restaurant,
        greetingMessage: data.greetingMessage,
        worktime: data.workTime,
        key: data.key,
        webhook: {
            enabled: webhook,
            webhookUrl: webhookUrl,
        },
        qrcode: {
            url: appUrl + '/instance/qr?key=' + data.key,
        },
        browser: config.browser,
    })
}

exports.qr = async (req, res) => {
    try {
        const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr
        res.render('qrcode', {
            qrcode: qrcode,
        })
    } catch {
        res.json({
            qrcode: '',
        })
    }
}

exports.qrbase64 = async (req, res) => {
    try {
        const qrcode = await WhatsAppInstances[req.query.key]?.instance.qr
        res.json({
            error: false,
            message: 'QR Base64 fetched successfully',
            qrcode: qrcode,
        })
    } catch {
        res.json({
            qrcode: '',
        })
    }
}

exports.info = async (req, res) => {
    const instance = WhatsAppInstances[req.query.key]
    let data
    try {
        data = await instance.getInstanceDetail(req.query.key)
    } catch (error) {
        data = {}
    }
    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        instance_data: data,
    })
}

exports.getKey = async (req, res) => {
    const { number } = req.query

    let instance = Object.keys(WhatsAppInstances).map(
        async (key) => await WhatsAppInstances[key].getInstanceDetail(key)
    )
    let instances = await Promise.all(instance)

    const data = await instances.find((value) => {
        console.log(value)

        const id = value.user.id.split(':')[0]
        return id === number
    })

    if (!data) {
        return res.status(400).json({
            error: true,
            message: `Não foi possível encontrar um bot com esse número`,
            data: null,
        })
    }

    return res.json({
        error: false,
        message: `API KEY do restaurante ${data.restaurant}`,
        data: data.instance_key,
    })
}

exports.restore = async (req, res, next) => {
    try {
        const session = new Session()
        let restoredSessions = await session.restoreSessions()
        return res.json({
            error: false,
            message: 'All instances restored',
            data: restoredSessions,
        })
    } catch (error) {
        next(error)
    }
}

exports.logout = async (req, res) => {
    let errormsg
    try {
        await WhatsAppInstances[req.query.key].instance?.sock?.logout()
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'logout successfull',
        errormsg: errormsg ? errormsg : null,
    })
}

exports.edit = async (req, res) => {
    const { restaurant, greetingMessage, workTime } = req.body

    if (restaurant === '' || !restaurant) {
        return res.json({
            error: true,
            message: 'restaurant field is missing',
            instance_data: null,
        })
    }
    if (workTime.length < 7) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'You forgot to send some field in worktime array',
        })
    }

    if (workTime.length > 7) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'You send too much fields in worktime array',
        })
    }

    if (greetingMessage === '' || !greetingMessage) {
        return res.json({
            error: true,
            message: 'greetingMessage field is missing',
            instance_data: null,
        })
    }

    if (!req.query.key) {
        return res.json({
            error: true,
            message: 'key query is missing',
            instance_data: null,
        })
    }

    const instance = WhatsAppInstances[req.query.key]
    let data
    try {
        data = await instance.editCreds(restaurant, greetingMessage, workTime)
    } catch (error) {
        data = {}
    }
    return res.json({
        error: false,
        message: 'Instance edited sucessfully',
        instance_data: data,
    })
}

exports.delete = async (req, res) => {
    let errormsg
    try {
        await WhatsAppInstances[key].deleteInstance(req.query.key)
        delete WhatsAppInstances[req.query.key]
    } catch (error) {
        errormsg = error
    }
    return res.json({
        error: false,
        message: 'Instance deleted successfully',
        data: errormsg ? errormsg : null,
    })
}

exports.list = async (req, res) => {
    if (req.query.active) {
        let instance = Object.keys(WhatsAppInstances).map(async (key) =>
            WhatsAppInstances[key].getInstanceDetail(key)
        )
        let data = await Promise.all(instance)
        return res.json({
            error: false,
            message: 'All active instance',
            data: data,
        })
    } else {
        let instance = []
        const db = mongoClient.db('whatsapp-api')
        const result = await db.listCollections().toArray()
        result.forEach((collection) => {
            instance.push(collection.name)
        })

        return res.json({
            error: false,
            message: 'All instance listed',
            data: instance,
        })
    }
}
