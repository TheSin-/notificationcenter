<?php

/**
* The easiest way to throw a notification using CuRL
*
* For more informations about the notification center please visit
*   http://lab.mbuonomo.com/notificationcenter
*
* @author Mathieu BUONOMO <mbuonomo@gmail.com>
* @version 0.1
*/
class notificationcenter {
	/**
	 * Server url
	 *
	 * By using Faye it's something like http://yourserverip:port/faye
	 *
	 * @var string
	 */
	private $_sServerUrl = "";

	/**
	 * Your channel
	 *
	 * For example : /messages
	 *
	 * @var string
	 */
	private $_sChannel = "";

	/**
	 * This method will be called to send a request
	 *
	 * Really simple cUrl :)
	 *
	 * @param string $sUrl
	 * @return void
	 */
	private function sendRequest($sUrl, $aParams) {
		$data_string = json_encode(array(
			"channel" => $this->_sChannel,
			"data" => $aParams
		));

		$ch = curl_init($this->_sServerUrl);
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array(
			'Content-Type: application/json',
			'Content-Length: ' . strlen($data_string))
		);

		$output = curl_exec($ch);

		if ($output === false) {
			trigger_error('Erreur curl : '.curl_error($ch),E_USER_WARNING);
		} else {
			curl_close($ch);
			return $output;
		}
	}

	public function __construct($server, $channel) {
		$this->_sServerUrl = $server;
		$this->_sChannel = $channel;
	}

	public function shoot($message, $type) {
		$aParams['text'] = $message;
		$aParams['type'] = $type;
		return $this->sendRequest($this->_sServerUrl, $aParams);
	}
}
?>
