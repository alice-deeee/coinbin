$(document).ready(function() {

	/* open wallet code */

	$("#openBtn").click(function(){
		var email = $("#openEmail").val().toLowerCase();
		if(email.match(/[\s\w\d]+@[\s\w\d]+/g)){
			if($("#openPass").val().length>=10){
				if($("#openPass").val()==$("#openPassConfirm").val()){

					var email = $("#openEmail").val().toLowerCase();
					var pass = $("#openPass").val();
					var s = email;
					s += '|'+pass+'|';
					s += s.length+'|!@'+((pass.length*7)+email.length)*7;
					var regchars = (pass.match(/[a-z]+/g)) ? pass.match(/[a-z]+/g).length : 1;
					var regupchars = (pass.match(/[A-Z]+/g)) ? pass.match(/[A-Z]+/g).length : 1;
					var regnums = (pass.match(/[0-9]+/g)) ? pass.match(/[0-9]+/g).length : 1;
					s += ((regnums+regchars)+regupchars)*pass.length+'3571';
					s += (s+s);

					for(i=0;i<=50;i++){
						s = Crypto.SHA256(s);
					}

					coinjs.compressed = true;
					var keys = coinjs.newKeys(s);

					$("#walletAddress").html(keys.address);
					$("#walletHistory").attr('href','http://www.blockchain.info/address/'+keys.address);
					$("#walletQrCode").html('<img src="https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=bitcoin:'+keys.address+'">');
					$("#walletKeys .privkey").val(keys.wif);
					$("#walletKeys .pubkey").val(keys.pubkey);

					$("#openLogin").hide();
					$("#openWallet").removeClass("hidden").show();

					walletBalance();
					checkBalanceLoop();
				} else {
					$("#openLoginStatus").html("Your passwords do not match!").removeClass("hidden").fadeOut().fadeIn();
				}
			} else {
				$("#openLoginStatus").html("Your password must be at least 10 chars long").removeClass("hidden").fadeOut().fadeIn();
			}
		} else {
			$("#openLoginStatus").html("Your email address doesn't appear to be valid").removeClass("hidden").fadeOut().fadeIn();
		}

		$("#openLoginStatus").prepend('<span class="glyphicon glyphicon-exclamation-sign"></span> ');
	});

	$("#walletLogout").click(function(){
		$("#openEmail").val("");
		$("#openPass").val("");
		$("#openPassConfirm").val("");

		$("#openLogin").show();
		$("#openWallet").addClass("hidden").show();

		$("#walletAddress").html("");
		$("#walletHistory").attr('href','http://www.blockchain.info/address/');
		$("#walletQrCode").html('<img src="https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=bitcoin:">');
		$("#walletKeys .privkey").val("");
		$("#walletKeys .pubkey").val("");

	});

	$("#walletShowKeys").click(function(){
		$("#walletKeys").removeClass("hidden");
		$("#walletSpend").removeClass("hidden").addClass("hidden");
	});

	$("#walletBalance").click(function(){
		walletBalance();
	});

	$("#walletConfirmSend").click(function(){
		var thisbtn = $(this);
		var tx = coinjs.transaction();
		var txfee = $("#txFee");
		var devaddr = coinjs.developer;
		var devamount = $("#developerDonation");

		if((devamount.val()*1)>0){
			tx.addoutput(devaddr, devamount.val()*1);
		}

		var total = (devamount.val()*1) + (txfee.val()*1);

		$.each($("#walletSpendTo .output"), function(i,o){
			var addr = $('.addressTo',o);
			var amount = $('.amount',o);
			total += amount.val()*1;
			tx.addoutput(addr.val(), amount.val()*1);
		});

		thisbtn.attr('disabled',true);

		tx.addUnspent($("#walletAddress").html(), function(data){
			var dvalue = data.value/100000000
			if(dvalue>=total){
				var change = dvalue-total;
				if(change>0){
					tx.addoutput($("#walletAddress").html(), change);
				}

				// clone the transaction with out using coinjs.clone() function as it gives us trouble
				var tx2 = coinjs.transaction(); 
				var txunspent = tx2.deserialize(tx.serialize()); 

				// then sign
				var signed = txunspent.sign($("#walletKeys .privkey").val());

				// and finally broadcast!
				tx2.broadcast(function(data){
					if($(data).find("result").text()=="1"){
						$("#walletSendConfirmStatus").removeClass('hidden').addClass('alert-success').html("txid: "+$(data).find("txid").text());
					} else {
						$("#walletSendConfirmStatus").removeClass('hidden').addClass('alert-danger').html(unescape($(data).find("response").text()).replace(/\+/g,' '));
					}

					// update wallet balance
					walletBalance();

				}, signed);
			} else {
				$("#walletSendConfirmStatus").removeClass("hidden").addClass('alert-danger').html("You have a confirmed balance of "+data.value+" BTC unable to send "+total+" BTC").fadeOut().fadeIn();
			}

			thisbtn.attr('disabled',false);
			$("#walletLoader").addClass("hidden");
		});
	});

	$("#walletSendBtn").click(function(){

		$("#walletSendStatus").addClass("hidden").html("");

		var thisbtn = $(this);
		var txfee = $("#txFee");
		var devamount = $("#developerDonation");

		if((!isNaN(devamount.val())) && devamount.val()>=0){
			$(devamount).parent().removeClass('has-error');
		} else {
			$(devamount).parent().addClass('has-error')
		}

		if((!isNaN(txfee.val())) && txfee.val()>=0){
			$(txfee).parent().removeClass('has-error');
		} else {
			$(txfee).parent().addClass('has-error');
		}

		var total = (devamount.val()*1) + (txfee.val()*1);

		$.each($("#walletSpendTo .output"), function(i,o){
			var amount = $('.amount',o);
			var address = $('.addressTo',o);

			total += amount.val()*1;

			if((!isNaN($(amount).val())) && $(amount).val()>0){
				$(amount).parent().removeClass('has-error');
			} else {
				$(amount).parent().addClass('has-error');			
			}

			if(coinjs.addressDecode($(address).val())){
				$(address).parent().removeClass('has-error');
			} else {
				$(address).parent().addClass('has-error');
			}
		});

		total = total.toFixed(8);

		if($("#walletSpend .has-error").length==0){
			var balance = ($("#walletBalance").html()).replace(/[^0-9\.]+/g,'')*1;
			if(total<=balance){
				$("#walletSendConfirmStatus").addClass("hidden").removeClass('alert-success').removeClass('alert-danger').html("");
				$("#spendAmount").html(total);
				$("#modalWalletConfirm").modal("show");
				$("#walletConfirmSend").attr('disabled',false);
			} else {
				$("#walletSendStatus").removeClass("hidden").html("You are trying to spend "+total+' but have a balance of '+balance);
			}
		} else {
			$("#walletSpend .has-error").fadeOut().fadeIn();
			$("#walletSendStatus").removeClass("hidden").html('<span class="glyphicon glyphicon-exclamation-sign"></span> One or more input has an error');
		}
	});

	$("#walletShowSpend").click(function(){
		$("#walletSpend").removeClass("hidden");
		$("#walletKeys").removeClass("hidden").addClass("hidden");
	});

	$("#walletSpendTo .addressAdd").click(function(){
		var clone = '<div class="form-inline output">'+$(this).parent().html()+'</div>';
		$("#walletSpendTo").append(clone);
		$("#walletSpendTo .glyphicon-plus:last").removeClass('glyphicon-plus').addClass('glyphicon-minus');
		$("#walletSpendTo .glyphicon-minus:last").parent().removeClass('addressAdd').addClass('addressRemove');
		$("#walletSpendTo .addressRemove").unbind("");
		$("#walletSpendTo .addressRemove").click(function(){
			$(this).parent().fadeOut().remove();
		});
	});

	function walletBalance(){
		var tx = coinjs.transaction();
		$("#walletLoader").removeClass("hidden");
		coinjs.addressBalance($("#walletAddress").html(),function(data){
			if($(data).find("result").text()==1){
				var v = $(data).find("balance").text()/100000000;
				$("#walletBalance").html(v+" BTC").attr('rel',v).fadeOut().fadeIn();
			} else {
				$("#walletBalance").html("0.00 BTC").attr('rel',v).fadeOut().fadeIn();
			}

			$("#walletLoader").addClass("hidden");
		});
	}

	function checkBalanceLoop(){
		setTimeout(function(){
			walletBalance();
			checkBalanceLoop();
		},45000);
	}

	/* new -> address code */

	$("#newKeysBtn").click(function(){
		coinjs.compressed = false;
		if($("#newCompressed").is(":checked")){
			coinjs.compressed = true;
		}
		var s = ($("#newBrainwallet").is(":checked")) ? $("#brainwallet").val() : null;
		var coin = coinjs.newKeys(s);
		$("#newBitcoinAddress").val(coin.address);
		$("#newPubKey").val(coin.pubkey);
		$("#newPrivKey").val(coin.wif);
	});

	$("#newBrainwallet").click(function(){
		if($(this).is(":checked")){
			$("#brainwallet").removeClass("hidden");
		} else {
			$("#brainwallet").addClass("hidden");
		}
	});

	/* new -> multisig code */

	$("#newMultiSigAddress").click(function(){

		$("#multiSigData").removeClass('show').addClass('hidden').fadeOut();
		$("#multisigPubKeys .pubkey").parent().removeClass('has-error');
		$("#releaseCoins").parent().removeClass('has-error');
		$("#multiSigErrorMsg").hide();

		if((isNaN($("#releaseCoins option:selected").html())) || ((!isNaN($("#releaseCoins option:selected").html())) && ($("#releaseCoins option:selected").html()>$("#multisigPubKeys .pubkey").length || $("#releaseCoins option:selected").html()*1<=0 || $("#releaseCoins option:selected").html()*1>8))){
			$("#releaseCoins").parent().addClass('has-error');
			$("#multiSigErrorMsg").html('<span class="glyphicon glyphicon-exclamation-sign"></span> Minimum signatures required is greater than the amount of public keys provided').fadeIn();
			return false;
		}

		var keys = [];
		$.each($("#multisigPubKeys .pubkey"), function(i,o){
			if(coinjs.pubkeydecompress($(o).val())){
				keys.push($(o).val());
				$(o).parent().removeClass('has-error');
			} else {
				$(o).parent().addClass('has-error');
			}
		});

		if(($("#multisigPubKeys .pubkey").parent().hasClass('has-error')==false) && $("#releaseCoins").parent().hasClass('has-error')==false){
			var sigsNeeded = $("#releaseCoins option:selected").html();
			var multisig =  coinjs.pubkeys2MultisigAddress(keys, sigsNeeded);
			$("#multiSigData .address").val(multisig['address']);
			$("#multiSigData .script").val(multisig['redeemScript']);
			$("#multiSigData").removeClass('hidden').addClass('show').fadeIn();
			$("#releaseCoins").removeClass('has-error');
		} else {
			$("#multiSigErrorMsg").html('<span class="glyphicon glyphicon-exclamation-sign"></span> One or more public key is invalid!').fadeIn();
		}
	});

	$("#multisigPubKeys .pubkeyAdd").click(function(){
		if($("#multisigPubKeys .pubkeyRemove").length<14){
			var clone = '<div class="form-inline">'+$(this).parent().html()+'</div>';
			$("#multisigPubKeys").append(clone);
			$("#multisigPubKeys .glyphicon-plus:last").removeClass('glyphicon-plus').addClass('glyphicon-minus');
			$("#multisigPubKeys .glyphicon-minus:last").parent().removeClass('pubkeyAdd').addClass('pubkeyRemove');
			$("#multisigPubKeys .pubkeyRemove").unbind("");
			$("#multisigPubKeys .pubkeyRemove").click(function(){
				$(this).parent().fadeOut().remove();
			});
		}
	});

	/* new -> transaction code */

	$("#recipients .addressAddTo").click(function(){
		if($("#recipients .addressRemoveTo").length<19){
			var clone = '<div class="row recipient"><br>'+$(this).parent().parent().html()+'</div>';
			$("#recipients").append(clone);
			$("#recipients .glyphicon-plus:last").removeClass('glyphicon-plus').addClass('glyphicon-minus');
			$("#recipients .glyphicon-minus:last").parent().removeClass('addressAdd').addClass('addressRemoveTo');
			$("#recipients .addressRemoveTo").unbind("");
			$("#recipients .addressRemoveTo").click(function(){
				$(this).parent().parent().fadeOut().remove();
				validateOutputAmount();
			});
			validateOutputAmount();
		}
	});

	$("#inputs .txidAdd").click(function(){
		var clone = '<div class="row inputs"><br>'+$(this).parent().parent().html()+'</div>';
		$("#inputs").append(clone);
		$("#inputs .txidClear:last").remove();
		$("#inputs .glyphicon-plus:last").removeClass('glyphicon-plus').addClass('glyphicon-minus');
		$("#inputs .glyphicon-minus:last").parent().removeClass('txidAdd').addClass('txidRemove');
		$("#inputs .txidRemove").unbind("");
		$("#inputs .txidRemove").click(function(){
			$(this).parent().parent().fadeOut().remove();
			totalInputAmount();
		});
		$("#inputs .row:last input").attr('disabled',false);

		$("#inputs .txIdAmount").unbind("").change(function(){
			totalInputAmount();
		}).keyup(function(){
			totalInputAmount();
		});

	});

	$("#transactionBtn").click(function(){
		var tx = coinjs.transaction();
		$.each($("#inputs .row"), function(i,o){
			if($(".txId",o).val()!="" && $(".txIdN",o).val()!=""){
				tx.addinput($(".txId",o).val(), $(".txIdN",o).val(), $(".txIdScript",o).val());
			}
		});

		$.each($("#recipients .row"), function(i,o){
			if($(".address",o).val()!="" && $(".amount",o).val()!=""){
				tx.addoutput($(".address",o).val(), $(".amount",o).val());
			}
		});

		$("#transactionCreate textarea").val(tx.serialize());
		$("#transactionCreate .txSize").html(tx.size());

		$("#transactionCreate").removeClass("hidden");
	});

	$(".txidClear").click(function(){
		$("#inputs .row:first input").attr('disabled',false);
		$("#inputs .row:first input").val("");
		totalInputAmount();
	});

	$("#inputs .txIdAmount").unbind("").change(function(){
		totalInputAmount();
	}).keyup(function(){
		totalInputAmount();
	});

	$("#redeemFromBtn").click(function(){
		var thisbtn = this;
		var addr = '';
		var isMultiSig = false;
		var s = $("#redeemFrom").val();

		$("#redeemFromStatus, #redeemFromAddress").addClass('hidden');
		$(thisbtn).html("Please wait, loading...").attr('disabled',true);

		var decode = coinjs.addressDecode(s);

		if(decode.version == coinjs.pub){
			addr = s;
		} else if (decode.version == coinjs.priv){
			var a = coinjs.wif2address(s);
			addr = a['address'];
		} else if (decode.version == coinjs.multisig){
			$("#redeemFromStatus").removeClass('hidden').html('<span class="glyphicon glyphicon-exclamation-sign"></span> You should use the redeem script, not the multisig address!');
		} else {
			var script = coinjs.script();
			var decodeRs = script.decodeRedeemScript(s);
			if(decodeRs){
				addr = decodeRs['address'];
				isMultiSig = true;
			} else {
				// input is neither a regular address or redeem script
				$("#redeemFromStatus").removeClass('hidden').html('<span class="glyphicon glyphicon-exclamation-sign"></span> The address or multisig redeem script you have entered is invalid');
			}
		}

		var tx = coinjs.transaction();
		tx.listUnspent(addr, function(data){
			if(addr) {
				if($("#clearInputsOnLoad").is(":checked")){
					$("#inputs .txidRemove, #inputs .txidClear").click();
				}

				$("#redeemFromAddress").removeClass('hidden').html('<span class="glyphicon glyphicon-info-sign"></span> Retrieved unspent inputs from address <a href="https://www.blockchain.info/address/'+addr+'" target="_blank">'+addr+'</a>');

				$.each($(data).find("unspent").children(), function(i,o){
					var val = (($(o).find("value").text()*1)/100000000);
					var txid = (($(o).find("tx_hash").text()).match(/.{1,2}/g).reverse()).join("")+'';

					$("#inputs .txId:last").val(txid);
					$("#inputs .txIdN:last").val($(o).find("tx_output_n").text());
					$("#inputs .txIdAmount:last").val(val.toFixed(8));
					if(isMultiSig==true){
						$("#inputs .txIdScript:last").val(s);
					} else {
						$("#inputs .txIdScript:last").val($(o).find("script").text());
					}

					$("#inputs .row:last input").attr('disabled',true);

					if(i<($(data).find("unspent").children().length-1)){
						$("#inputs .txidAdd").click();
					}
				});
			}

			$(thisbtn).html("Load").attr('disabled',false);
			totalInputAmount();
		});
	});

	function totalInputAmount(){
		$("#totalInput").html('0.00');
		$.each($("#inputs .txIdAmount"), function(i,o){
			if(isNaN($(o).val())){
				$(o).parent().addClass('has-error');
			} else {
				$(o).parent().removeClass('has-error');
				var f = 0;
				if(!isNaN($(o).val())){
					f += $(o).val()*1;
				}
				$("#totalInput").html((($("#totalInput").html()*1) + (f*1)).toFixed(8));
			}
		});
		totalFee();
	}

	function validateOutputAmount(){
		$("#recipients .amount").unbind('');
		$("#recipients .amount").keyup(function(){
			if(isNaN($(this).val())){
				$(this).parent().addClass('has-error');
			} else {
				$(this).parent().removeClass('has-error');
				var f = 0;
				$.each($("#recipients .amount"),function(i,o){
					if(!isNaN($(o).val())){
						f += $(o).val()*1;
					}
				});
				$("#totalOutput").html((f).toFixed(8));
			}
			totalFee();
		}).keyup();
	}

	function totalFee(){
		var fee = (($("#totalInput").html()*1) - ($("#totalOutput").html()*1)).toFixed(8);
		$("#transactionFee").val((fee>0)?fee:'0.00');
	}

	/* broadcast a transaction */

	$("#rawSubmitBtn").click(function(){
		var thisbtn = this;
		var tx = coinjs.transaction();
		$(thisbtn).val('Please wait, loading...').attr('disabled',true);
		tx.broadcast(function(data){
			$("#rawTransactionStatus").html(unescape($(data).find("response").text()).replace(/\+/g,' ')).removeClass('hidden');
			if($(data).find("result").text()==1){
				$("#rawTransactionStatus").addClass('alert-success').removeClass('alert-danger');
				$("#rawTransactionStatus").html('txid: '+$(data).find("txid").text());
			} else {
				$("#rawTransactionStatus").addClass('alert-danger').removeClass('alert-success').prepend('<span class="glyphicon glyphicon-exclamation-sign"></span> ');
			}
			$("#rawTransactionStatus").fadeOut().fadeIn();
			$(thisbtn).val('Submit').attr('disabled',false);
		}, $("#rawTransaction").val());
	});

	/* verify script code */

	$("#verifyBtn").click(function(){
		$(".verifyData").addClass("hidden");
		$("#verifyStatus").hide();
		if(!decodeRedeemScript()){
			if(!decodeTransactionScript()){
				if(!decodePrivKey()){
					if(!decodePubKey()){
						$("#verifyStatus").removeClass('hidden').fadeOut().fadeIn();
					}
				}
			}
		}

	});

	function decodeRedeemScript(){
		var script = coinjs.script();
		var decode = script.decodeRedeemScript($("#verifyScript").val());
		if(decode){
			$("#verifyRsData .multisigAddress").val(decode['address']);
			$("#verifyRsData .signaturesRequired").html(decode['signaturesRequired']);
			$("#verifyRsData table tbody").html("");
			for(var i=0;i<decode.pubkeys.length;i++){
				$('<tr><td><input type="text" class="form-control" value="'+decode.pubkeys[i]+'" readonly></td></tr>').appendTo("#verifyRsData table tbody");
			}
			$("#verifyRsData").removeClass("hidden");
			return true;
		} else {
			return false;
		}
	}

	function decodeTransactionScript(){
		var tx = coinjs.transaction();
		try {
			var decode = tx.deserialize($("#verifyScript").val());
			$("#verifyTransactionData .transactionVersion").html(decode['version']);
			$("#verifyTransactionData .transactionSize").html(decode.size()+' <i>bytes</i>');
			$("#verifyTransactionData .transactionLockTime").html(decode['lock_time']);
			$("#verifyTransactionData").removeClass("hidden");
			$("#verifyTransactionData tbody").html("");

			var h = '';
			$.each(decode.ins, function(i,o){
				var s = decode.extractScriptKey(i);
				h += '<tr>';
				h += '<td><input class="form-control" type="text" value="'+o.outpoint.hash+'" readonly></td>';
				h += '<td class="col-xs-1">'+o.outpoint.index+'</td>';
				h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
				h += '<td class="col-xs-1"> <span class="glyphicon glyphicon-'+((s.signed=='true')?'ok':'remove')+'-circle"></span>';
				if(s['type']=='multisig' && s['signatures']>=1){
					h += ' '+s['signatures'];
				}
				h += '</td>';
				h += '<td class="col-xs-1">';
				if(s['type']=='multisig'){
					var script = coinjs.script();
					var rs = script.decodeRedeemScript(s.script);
					h += rs['signaturesRequired']+' of '+rs['pubkeys'].length;
				} else {
					h += '<span class="glyphicon glyphicon-remove-circle"></span>';
				}
				h += '</td>';
				h += '</tr>';
			});
			$(h).appendTo("#verifyTransactionData .ins tbody");

			h = '';
			$.each(decode.outs, function(i,o){

				var addr = '';
				if(o.script.chunks.length==5){
					addr = coinjs.scripthash2address(Crypto.util.bytesToHex(o.script.chunks[2]));
				} else {
					var priv = coinjs.priv;
					coinjs.priv = 0x05;
					addr = coinjs.scripthash2address(Crypto.util.bytesToHex(o.script.chunks[1]));
					coinjs.priv = priv;
				}

				h += '<tr>';
				h += '<td><input class="form-control" type="text" value="'+addr+'" readonly></td>';
				h += '<td class="col-xs-1">'+(o.value/100000000).toFixed(8)+'</td>';
				h += '<td class="col-xs-2"><input class="form-control" type="text" value="'+Crypto.util.bytesToHex(o.script.buffer)+'" readonly></td>';
				h += '</tr>';
			});
			$(h).appendTo("#verifyTransactionData .outs tbody");

			return true;
		} catch(e) {
			return false;
		}
	}

	function decodePrivKey(){
		var wif = $("#verifyScript").val();
		if(wif.length==51 || wif.length==52){
			try {
				var w2address = coinjs.wif2address(wif);
				var w2pubkey = coinjs.wif2pubkey(wif);
				var w2privkey = coinjs.wif2privkey(wif);

				$("#verifyPrivKey .address").val(w2address['address']);
				$("#verifyPrivKey .pubkey").val(w2pubkey['pubkey']);
				$("#verifyPrivKey .privkey").val(w2privkey['privkey']);
				$("#verifyPrivKey .iscompressed").html(w2address['compressed']?'true':'false');

				$("#verifyPrivKey").removeClass("hidden");
				return true;
			} catch (e) {
				return false;
			}
		} else {
			return false;
		}
	}

	function decodePubKey(){
		var pubkey = $("#verifyScript").val();
		if(pubkey.length==66 || pubkey.length==130){
			try {
				$("#verifyPubKey .address").val(coinjs.pubkey2address(pubkey));
				$("#verifyPubKey").removeClass("hidden");
				return true;
			} catch (e) {
				return false;
			}
		} else {
			return false;
		}
	}

	/* sign code */

	$("#signBtn").click(function(){
		var wifkey = $("#signPrivateKey");
		var script = $("#signTransaction");

		if(coinjs.addressDecode(wifkey.val())){
			$(wifkey).parent().removeClass('has-error');
		} else {
			$(wifkey).parent().addClass('has-error');
		}

		if((script.val()).match(/^[a-f0-9]+$/ig)){
			$(script).parent().removeClass('has-error');
		} else {
			$(script).parent().addClass('has-error');
		}

		if($("#sign .has-error").length==0){
			$("#signedDataError").addClass('hidden');
			try {
				var tx = coinjs.transaction();
				var t = tx.deserialize(script.val());
				var signed = t.sign(wifkey.val());
				$("#signedData textarea").val(signed);
				$("#signedData .txSize").html(t.size());
				$("#signedData").removeClass('hidden').fadeIn();
			} catch(e) {
				// console.log(e);
			}
		} else {
			$("#signedDataError").removeClass('hidden');
			$("#signedData").addClass('hidden');
		}
	});


	/* page load code */

	$(".qrcodeBtn").click(function(){
		var thisbtn = $(this).parent().parent();
		$("#qrcode").attr('src','https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=bitcoin:'+$('.address',thisbtn).val());
	});

	$('input[title!=""], abbr[title!=""]').tooltip({'placement':'bottom'});

	if (location.hash !== ''){
		$('a[href="' + location.hash + '"]').tab('show');
	}

	$(".showKey").click(function(){
		$("input[type='password']",$(this).parent().parent()).attr('type','text');
	});

	$("#homeBtn").click(function(e){
		e.preventDefault();
		history.pushState(null, null, '#home');
		$("#header .active, #content .tab-content").removeClass("active");
		$("#home").addClass("active");
	});

	$('a[data-toggle="tab"]').on('click', function(e) {
		e.preventDefault();
		if(e.target){
			history.pushState(null, null, '#'+$(e.target).attr('href').substr(1));
		}
	});

	window.addEventListener("popstate", function(e) {
		var activeTab = $('[href=' + location.hash + ']');
		if (activeTab.length) {
			activeTab.tab('show');
		} else {
			$('.nav-tabs a:first').tab('show');
		}
	});

	for(i=1;i<3;i++){
		$(".pubkeyAdd").click();
	}

	$("#newKeysBtn").click();

	validateOutputAmount();
});