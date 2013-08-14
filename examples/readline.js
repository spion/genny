var getLine = genny.fn(function* (resume, file, number) {
    var data = yield fs.readFile(file, resume.t);
    return data.toString().split('\n')[number];
});

getLine('test.js', 2, function(err, lineContent) {
    // thrown error propagates here automagically 
    // because it was not caught.
    // If the file actually exists, lineContent
    // will contain the second line
});


exports.createWithUserAccount = genny.fn(function *(resume, newAccount) {

    yield exports.create({
        accountType: newAccount.accountType,
        service: newAccount.service,
        credentials: newAccount.oauthCredentials,
        isShared: newAccount.isShared
    }, resume.t); 

    var address = UserAccount.getAddress({
        accountType: newAccount.accountType,
        username: newAccount.username,
        companyName: newAccount.companyName
    });
    var userAccount = yield UserAccount.create({
        address: address,
        userId: newAccount.userId,
        displayName: newAccount.displayName,
        accountId: account[0].id
    }, resume.t); 

    yield AccountAdmin.create({
        accountId: userAccount[0].accountId,
        userId: userAccount[0].userId
    }, resume.t); 

    return userAccount.id;
}
