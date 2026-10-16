/*
  ====================================================================================
  Projet       : SensorHub - Firmware ESP32-CAM (Flux Vidéo MJPEG)
  Description  : Diffuse un flux vidéo temps réel sur le réseau local pour SensorHub
  Matériel     : Module ESP32-CAM AI-Thinker avec capteur OV2640
  ====================================================================================

  CONFIG ARDUINO IDE :
  - Outils > Type de carte : "AI Thinker ESP32-CAM"
  - Outils > CPU Frequency : "240MHz (WiFi/BT)"
  - Outils > Flash Frequency : "80MHz"
  - Outils > Partition Scheme : "Huge APP (3MB No OTA/1MB SPIFFS)"

  BRANCHEMENT PROGRAMMATION :
  - Si vous avez la carte d'extension USB (ESP32-CAM-MB) : branchez simplement en USB !
  - Si vous utilisez un adaptateur FTDI USB-Série :
      FTDI 5V  -> ESP32-CAM 5V
      FTDI GND -> ESP32-CAM GND
      FTDI TX  -> ESP32-CAM U0R (RX)
      FTDI RX  -> ESP32-CAM U0T (TX)
      ⚠️ TRÈS IMPORTANT : Reliez GPIO 0 à GND pendant le téléversement, 
         puis débranchez GPIO 0 et appuyez sur RESET pour démarrer la caméra !
  ====================================================================================
*/

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "esp_http_server.h"

// ====================================================================================
// 1. VOS IDENTIFIANTS WIFI (2.4 GHz)
// ====================================================================================
const char* ssid     = "eliotness9000";
const char* password = "adem2005KAIS";

// ====================================================================================
// 2. AFFECTATION DES BROCHES DU MODÈLE AI-THINKER ESP32-CAM
// ====================================================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

#define FLASH_LED_GPIO    4 // Flash LED intégré

httpd_handle_t stream_httpd = NULL;

// Header de séparation de trames vidéo MJPEG
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// ====================================================================================
// 3. HANDLER DU FLUX VIDÉO MJPEG (/stream)
// ====================================================================================
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  // Autoriser l'accès CORS pour le site web SensorHub
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("[CAM] Échec capture d'image");
      res = ESP_FAIL;
    } else {
      _jpg_buf_len = fb->len;
      _jpg_buf = fb->buf;
    }

    if (res == ESP_OK) {
      size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if (res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }

    if (fb) {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if (res != ESP_OK) {
      break;
    }
  }
  return res;
}

// Handler de capture d'image fixe (/capture)
static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

// Handler de contrôle du flash LED (/flash)
static esp_err_t flash_handler(httpd_req_t *req) {
  static bool flashState = false;
  flashState = !flashState;
  digitalWrite(FLASH_LED_GPIO, flashState ? HIGH : LOW);
  httpd_resp_set_type(req, "text/plain");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_send(req, flashState ? "ON" : "OFF", HTTPD_RESP_USE_STRLEN);
  return ESP_OK;
}

// ====================================================================================
// 4. DÉMARRAGE DU SERVEUR VIDÉO SUR LE PORT 81
// ====================================================================================
void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 81;
  config.ctrl_port = 81;

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t capture_uri = {
    .uri       = "/capture",
    .method    = HTTP_GET,
    .handler   = capture_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t flash_uri = {
    .uri       = "/flash",
    .method    = HTTP_GET,
    .handler   = flash_handler,
    .user_ctx  = NULL
  };

  Serial.printf("[SERVEUR] Démarrage du flux sur le port : %d\n", config.server_port);
  if (httpd_start(&stream_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
    httpd_register_uri_handler(stream_httpd, &capture_uri);
    httpd_register_uri_handler(stream_httpd, &flash_uri);
  }
}

// ====================================================================================
// 5. SETUP & INITIALISATION MATÉRIELLE
// ====================================================================================
void setup() {
  // Désactiver le brownout detector pour éviter les redémarrages intempestifs si l'alimentation faiblit
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("         SensorHub - Caméra ESP32-CAM OV2640            ");
  Serial.println("========================================================");

  pinMode(FLASH_LED_GPIO, OUTPUT);
  digitalWrite(FLASH_LED_GPIO, LOW); // Flash éteint

  // Configuration matérielle de la caméra
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Résolution et qualité d'image
  if (psramFound()) {
    Serial.println("[INFO] PSRAM détectée : résolution SVGA (800x600)");
    config.frame_size   = FRAMESIZE_VGA; // 640x480 fluide et net
    config.jpeg_quality = 12;            // 10-63 (plus bas = meilleure qualité)
    config.fb_count     = 2;
  } else {
    Serial.println("[INFO] Pas de PSRAM : résolution QVGA (320x240)");
    config.frame_size   = FRAMESIZE_QVGA;
    config.jpeg_quality = 14;
    config.fb_count     = 1;
  }

  // Initialisation de la caméra
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[ERREUR] Échec initialisation caméra 0x%x\n", err);
    return;
  }

  // Connexion WiFi
  Serial.print("[WiFi] Connexion à : ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[WiFi] ESP32-CAM Connectée au WiFi !");
  Serial.print("[WiFi] Adresse IP de la caméra : ");
  Serial.println(WiFi.localIP());

  // Démarrer le serveur HTTP de streaming vidéo
  startCameraServer();

  Serial.println("\n--------------------------------------------------------");
  Serial.println("  📷 CAMÉRA PRÊTE POUR SENSORHUB !");
  Serial.print("  Copiez cette URL dans la page 'Caméra' du site : ");
  Serial.printf("http://%s:81/stream\n", WiFi.localIP().toString().c_str());
  Serial.println("--------------------------------------------------------\n");
}

void loop() {
  // Le streaming vidéo est géré en tâche de fond par le serveur HTTP
  delay(10000);
}
