function updateTable(elem) {
  if (!$('#table-body').length) return;
  $('#table-body').html(elem);
}

window.stopItem = function (itemUrl) {
  $.ajax({
    url: '/api/download/stop?url=' + encodeURIComponent(itemUrl),
  }).done(function (data) {
    if (data !== 'OK') alert(data);
  });
}

window.restartItem = function (itemUrl) {
  $.ajax({
    url: '/api/download/restart?url=' + encodeURIComponent(itemUrl),
  }).done(function (data) {
    if (data !== 'OK') alert(data);
  });
}

window.removeItem = function (itemUrl) {
  $.ajax({
    url: '/api/download/remove?url=' + encodeURIComponent(itemUrl),
  }).done(function (data) {
    if (data !== 'OK') alert(data);
  });
}

window.refreshItems = function () {
  $.ajax({
    url: '/api/downloads',
  }).done(function (data) {
    if (!data || !data.length) {
      updateTable(
        `<tr>
          <td colspan="10" style="text-align: center">
            <code style="color: grey">No files found</code>
          </td>
        </tr>`
      );
    } else {
      updateTable(
        data.map(function (item) {
          var body = `<td title="${item.contentType}"><a href="${item.url}" target="_blank">${item.name}</a></td>`;
          if (item.finished && item.driveUrl) {
            body += `<td><a href="${item.driveUrl}" target="_blank">Open in Drive</a></td>`;
          } else {
            body += `<td>${item.status}</td>`;
          }
          // actions
          var actions = ''
          if (item.finished) {
            actions += `<button class="btn btn-sm" style="background: #ddd" onclick="restartItem('${item.url}')">Restart</button>`;
          } else {
            actions += `<button class="btn btn-sm" style="background: gold" onclick="stopItem('${item.url}')">Stop</button>`;
          }
          actions += `<button class="btn btn-sm" style="background: red" onclick="removeItem('${item.url}')">Remove</button>`;
          body += '<td>' + actions + '</td>';
          return `<tr>` + body + `</tr>`;
        })
      );
    }
  });
}

var interval = null;
window.autoRefresh = function () {
  if (interval) {
    clearInterval(interval);
    interval = null;
  } else {
    interval = setInterval(() => {
      if (!$ || !$.ajax) return;
      window.refreshItems();
    }, 1000);
  }
}

window.autoRefresh()
