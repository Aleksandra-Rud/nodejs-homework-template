const express = require("express");
const { NotFound, BadRequest } = require("http-errors");

const router = express.Router();

const { authenticate } = require("../../middlewares");
const { joiSchema } = require("../../model/contacts");
const { Contact } = require("../../model");
// const contactsOperations = require("../../model");

router.get("/", authenticate, async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const contacts = await Contact.find(
      { owner: _id },
      "-createdAt -updatedAt",
      { skip, limit: +limit }
    );
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.get("/:contactId", async (req, res, next) => {
  const { contactId } = req.params;
  try {
    const contacts = await Contact.findById(contactId);
    if (!contacts) {
      throw new NotFound();
    }
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

router.post("/", authenticate, async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { _id } = req.user;

    const newContact = await Contact.create({ ...req.body, owner: _id });
    res.status(201).json({
      status: "success",
      code: 201,
      data: {
        newContact,
      },
    });
  } catch (error) {
    if (error.message.includes("Cast to ObjectId failed")) {
      error.status = 400;
    }
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body);
    if (error) {
      throw new BadRequest(error.message);
    }
    const { contactId } = req.params;
    const updateContact = await Contact.findByIdAndUpdate(contactId, req.body, {
      new: true,
    });
    if (!updateContact) {
      throw new NotFound();
    }
    res.json(updateContact);
  } catch (error) {
    if (error.message.includes("validation failed")) {
      error.status = 404;
    }
    next(error);
  }
});

router.patch(":contactId/favorite", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { favorite } = req.body;
    const updateStatusContact = await Contact.findByIdAndUpdate(
      contactId,
      { favorite },
      {
        new: true,
      }
    );
    if (!updateStatusContact) {
      throw new NotFound("missing field favourite");
    }
    res.json({
      status: "success",
      code: 200,
      data: {
        updateStatusContact,
      },
    });
  } catch (error) {
    error.status = 404;
    error.message = "Not found";
    next(error);
  }
});

router.delete("/:contactId", async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const deleteContact = await Contact.findByIdAndRemove(contactId);
    if (!deleteContact) {
      throw new NotFound();
    }
    res.json({ message: "contact deleted" });
  } catch (error) {
    next(error);
  }
  res.json({ message: "template message" });
});

module.exports = router;
