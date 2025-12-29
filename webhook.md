[
  {
    "headers": {
      "host": "n8n.reframedigital.com.br",
      "user-agent": "axios/1.10.0",
      "content-length": "1117",
      "accept": "application/json, text/plain, */*",
      "accept-encoding": "gzip, compress, deflate, br",
      "content-type": "application/json",
      "x-forwarded-for": "172.18.0.1",
      "x-forwarded-host": "n8n.reframedigital.com.br",
      "x-forwarded-port": "443",
      "x-forwarded-proto": "https",
      "x-forwarded-server": "8c29572508f0",
      "x-real-ip": "172.18.0.1"
    },
    "params": {},
    "query": {},
    "body": {
      "event": "messages.upsert",
      "instance": "wpp-teste",
      "data": {
        "key": {
          "remoteJid": "117828233490476@lid",
          "fromMe": false,
          "id": "3EB0F68E5D0510673E6033",
          "senderPn": "553182366026@s.whatsapp.net"
        },
        "pushName": "Pedro",
        "status": "DELIVERY_ACK",
        "message": {
          "conversation": "eae",
          "messageContextInfo": {
            "deviceListMetadata": {
              "senderKeyHash": "c4fl041kv2dt+g==",
              "senderTimestamp": "1766987243",
              "senderAccountType": "E2EE",
              "receiverAccountType": "E2EE",
              "recipientKeyHash": "PdjPZ4Ot2qX/Eg==",
              "recipientTimestamp": "1765819797"
            },
            "deviceListMetadataVersion": 2,
            "messageSecret": "25srDUjHe/HCA7jzy09FCVgta9/vztTL0dDiLMoixTQ=",
            "limitSharingV2": {
              "sharingLimited": false,
              "trigger": "UNKNOWN",
              "limitSharingSettingTimestamp": "0",
              "initiatedByMe": false
            }
          }
        },
        "messageType": "conversation",
        "messageTimestamp": 1767026465,
        "instanceId": "1f4f23a3-a19c-40da-871b-0431f52a7e8e",
        "source": "web"
      },
      "destination": "https://n8n.reframedigital.com.br/webhook-test/wpp-reframe-digital",
      "date_time": "2025-12-29T13:41:05.548Z",
      "sender": "553184503630@s.whatsapp.net",
      "server_url": "https://pessoais-evolution-api.nu5jqr.easypanel.host",
      "apikey": "E28DABA6D293-463A-9F9D-2A1D7004E118"
    },
    "webhookUrl": "https://n8n.reframedigital.com.br/webhook-test/wpp-reframe-digital",
    "executionMode": "test"
  }
]

onde os parametros podem ser variaviados é claro.

WEBHOOK PRA CASO CLIENTE EXISTA: ENV.WEBHOOK_EXISTSCLIENT
WEBHOOK PRA CASO CLIENTE NAO EXISTA: ENV.WEBHOOK_NOTEXISTSCLIENT



