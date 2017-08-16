function validateEmail(email) {
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

function validate() {
	$("#result").text("");
	var email = $("#email").val();
	if (validateEmail(email)) {
		$("#result").text(email + " is valid :)");
		$("#result").css("color", "green");
	} else {
		$("#result").text(email + " is not valid :(");
		$("#result").css("color", "red");
	}
	return false;
}

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

$(window).bind("load", function () {
	var value = getParameterByName('ProductId');
	if (value !== '') {
		$('#ProductId').val(value);
	}
});

$("#validate").bind("click", validate);