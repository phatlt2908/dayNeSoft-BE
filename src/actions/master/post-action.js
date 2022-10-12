const pool = require("../../../configs/psql-connect");
const postRepo = require("../../respository/master/post-repo");
const commonFunction = require("../../actions/common-action");
const linkDownloadFunction = require("../../actions/master/link-download-action");
const drive = require("../../actions/drive");

save = async function (req, res) {
  try {
    const request = req.body;
    request.code = commonFunction.toKebab(request.code);

    let post = await pool.query(postRepo.GET_BY_ID_AND_CODE, [
      request.id,
      request.code,
    ]);

    request.content = request.content.replace(
      '<img src="https://drive.google.com"',
      '<img referrerpolicy="no-referrer" src="https://drive.google.com"'
    );

    // Save post and return id to save links and images
    let postId = request.id;
    if (post.rows.length) {
      // Check is different before update
      const oldPost = post.rows[0];
      const newPost = request;
      let isDifferent =
        oldPost.categoryCode !== oldPost.categoryCode ||
        oldPost.title !== newPost.title ||
        oldPost.description !== newPost.description ||
        oldPost.name !== newPost.name ||
        oldPost.content !== newPost.content;

      if (isDifferent) {
        // Insert backup record
        await pool.query(postRepo.INSERT_BACKUP, [request.id]);

        // Update current record to new version
        const sqlRes = await pool.query(postRepo.UPDATE, [
          request.code,
          request.name,
          request.categoryCode,
          request.title,
          request.description,
          new Date(),
          request.content,
          request.id,
        ]);

        postId = sqlRes.rows[0].id;
      }
    } else {
      const sqlRes = await pool.query(postRepo.INSERT, [
        request.code,
        request.name,
        request.categoryCode,
        request.title,
        request.description,
        request.content,
        new Date(),
        new Date(),
      ]);

      postId = sqlRes.rows[0].id;
    }

    // Save link by post id
    linkDownloadFunction.saveLinkDownloadByPostId(request.linkDownload, postId);

    // Save banner image
    saveBannerImage(postId, request.imgUrl, request.code);

    res.status(200).send();
  } catch (err) {
    console.error("Save post failed:", err);
    res.status(400).send({ mes: err });
  }
};

loadList = async function (req, res) {
  try {
    const categoryCode = req.body.categoryCode;

    const listSqlResult = await pool.query(postRepo.GET_LIST, [categoryCode]);
    const postList = listSqlResult.rows;

    res.status(200).send(postList);
  } catch (err) {
    console.error("Get post list failed:", err);
    res.status(400).send({ mes: err });
  }
};

loadDetail = async function (req, res) {
  try {
    const postCode = req.body.postCode;

    const postSqlResult = await pool.query(postRepo.GET_BY_CODE, [postCode]);
    const rawPost = postSqlResult.rows[0];
    const post = {
      id: rawPost.id,
      code: rawPost.code,
      name: rawPost.name,
      categoryCode: rawPost.category_code,
      title: rawPost.title,
      description: rawPost.description,
      content: rawPost.content,
      createdDate: rawPost.created_date,
      updatedDate: rawPost.updated_date,
      downloadNum: rawPost.download_num,
      readNum: rawPost.read_num,
    };

    let links = await linkDownloadFunction.getLinkDownloadByPostId(post.id);

    res.status(200).send({
      post: post,
      links: links,
    });
  } catch (err) {
    console.error("Save post failed:", err);
    res.status(400).send({ mes: err });
  }
};

uploadImage = async function (req, res) {
  try {
    drive.uploadFile(req.file, res, saveImage);
  } catch (err) {
    console.error("upload image failed:", err);
    res.status(400).send({ mes: err });
  }
};

saveImage = function (res, file) {
  let imageUrl = "https://drive.google.com/uc?id=" + file.imageId;

  let result = {
    fileName: file.fileName,
    uploaded: 1,
    url: imageUrl,
  };
  res.status(200).send(result);
};

saveBannerImage = async function (postId, imgUrl, alt) {
  // Get all link existed before register new
  await pool.query(postRepo.DELETE_BANNER_IMAGE, [postId]);

  // Replace google photo image by thumbnail
  imgUrl = imgUrl.replace("/uc?", "/thumbnail?");

  try {
    await pool.query(postRepo.SAVE_BANNER_IMAGE, [postId, imgUrl, alt]);
  } catch (err) {
    console.error("save banner image failed:", err);
  }
};

module.exports = {
  save,
  uploadImage,
  loadList,
  loadDetail,
};
